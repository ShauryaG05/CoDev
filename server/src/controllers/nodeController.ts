import { Response } from 'express';
import mongoose from 'mongoose';
import { Node } from '../models/Node.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getRealtimeGateway } from '../sockets/gateway.js';

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'sql':
      return 'sql';
    default:
      return 'plaintext';
  }
}

export async function getTree(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const nodes = await Node.find({ projectId }).sort({ type: 1, name: 1 }).lean();

    res.json({
      nodes: nodes.map((n) => ({
        id: n._id,
        projectId: n.projectId,
        parentId: n.parentId,
        type: n.type,
        name: n.name,
        language: n.language,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve file tree', message: err.message });
  }
}

export async function createNode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;
    const { name, type, parentId = null, content = '' } = req.body;

    if (!name || !type || !['file', 'folder'].includes(type)) {
      res.status(400).json({ error: 'Name and valid type (file/folder) are required' });
      return;
    }

    const trimmedName = name.trim();
    const parent = parentId && mongoose.Types.ObjectId.isValid(parentId) ? new mongoose.Types.ObjectId(parentId) : null;

    // Check duplicate name under same parent folder
    const conflict = await Node.findOne({
      projectId,
      parentId: parent,
      name: trimmedName,
    });

    if (conflict) {
      res.status(409).json({ error: `A ${type} named "${trimmedName}" already exists in this folder` });
      return;
    }

    const language = type === 'file' ? detectLanguage(trimmedName) : undefined;

    const node = await Node.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      parentId: parent,
      type,
      name: trimmedName,
      content,
      language,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    const formattedNode = {
      id: node._id,
      projectId: node.projectId,
      parentId: node.parentId,
      type: node.type,
      name: node.name,
      language: node.language,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };

    // Broadcast tree change
    const gateway = getRealtimeGateway();
    if (gateway) {
      gateway.emitTreeChanged(projectId, 'create', formattedNode);
    }

    res.status(201).json({ node: formattedNode });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create node', message: err.message });
  }
}

export async function updateNode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: projectId, nodeId } = req.params;
    const { name, parentId } = req.body;

    const node = await Node.findOne({ _id: nodeId, projectId });
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    let op: 'rename' | 'move' = 'rename';

    if (name && name.trim() !== node.name) {
      const trimmedName = name.trim();
      // Check conflict
      const conflict = await Node.findOne({
        projectId,
        parentId: node.parentId,
        name: trimmedName,
        _id: { $ne: node._id },
      });

      if (conflict) {
        res.status(409).json({ error: `A node named "${trimmedName}" already exists in this folder` });
        return;
      }

      node.name = trimmedName;
      if (node.type === 'file') {
        node.language = detectLanguage(trimmedName);
      }
    }

    if (parentId !== undefined) {
      op = 'move';
      node.parentId = parentId && mongoose.Types.ObjectId.isValid(parentId) ? new mongoose.Types.ObjectId(parentId) : null;
    }

    await node.save();

    const formattedNode = {
      id: node._id,
      projectId: node.projectId,
      parentId: node.parentId,
      type: node.type,
      name: node.name,
      language: node.language,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };

    const gateway = getRealtimeGateway();
    if (gateway) {
      gateway.emitTreeChanged(projectId, op, formattedNode);
    }

    res.json({ node: formattedNode });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update node', message: err.message });
  }
}

export async function deleteNode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: projectId, nodeId } = req.params;

    const node = await Node.findOne({ _id: nodeId, projectId });
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    // Helper for recursive deletion if folder
    async function deleteRecursive(targetNodeId: string) {
      const children = await Node.find({ parentId: targetNodeId, projectId });
      for (const child of children) {
        await deleteRecursive(child._id.toString());
      }
      await Node.findByIdAndDelete(targetNodeId);
    }

    await deleteRecursive(nodeId);

    const gateway = getRealtimeGateway();
    if (gateway) {
      gateway.emitTreeChanged(projectId, 'delete', { id: nodeId, name: node.name, type: node.type });
    }

    res.json({ message: 'Node deleted successfully', id: nodeId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete node', message: err.message });
  }
}
