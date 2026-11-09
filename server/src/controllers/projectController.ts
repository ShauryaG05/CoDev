import { Response } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Membership } from '../models/Membership.js';
import { Node } from '../models/Node.js';
import { Activity } from '../models/Activity.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getRealtimeGateway } from '../sockets/gateway.js';

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, description = '', defaultLanguage = 'javascript' } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    // 1. Create independent Project entity
    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      ownerId: new mongoose.Types.ObjectId(userId),
      defaultLanguage,
    });

    // 2. Create owner Membership
    await Membership.create({
      projectId: project._id,
      userId: new mongoose.Types.ObjectId(userId),
      role: 'owner',
    });

    // 3. Create starter files (e.g. README.md and main file)
    const readmeContent = `# ${project.name}\n\n${project.description || 'Welcome to your collaborative workspace!'}\n\nStart typing and invite your team to collaborate in real-time.`;

    const mainExt = defaultLanguage === 'python' ? 'py' : defaultLanguage === 'typescript' ? 'ts' : 'js';
    const mainSample =
      defaultLanguage === 'python'
        ? `# ${project.name}\ndef main():\n    print("Hello from CoDev!")\n\nif __name__ == "__main__":\n    main()\n`
        : `// ${project.name}\nconsole.log("Hello from CoDev!");\n`;

    const readmeNode = await Node.create({
      projectId: project._id,
      parentId: null,
      type: 'file',
      name: 'README.md',
      content: readmeContent,
      language: 'markdown',
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await Node.create({
      projectId: project._id,
      parentId: null,
      type: 'file',
      name: `index.${mainExt}`,
      content: mainSample,
      language: defaultLanguage,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    // Log Activity
    await Activity.create({
      projectId: project._id,
      actorId: new mongoose.Types.ObjectId(userId),
      type: 'project.created',
      payload: { name: project.name },
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        defaultLanguage: project.defaultLanguage,
        role: 'owner',
        createdAt: project.createdAt,
        defaultFileId: readmeNode._id,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create project', message: err.message });
  }
}

export async function getProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const membership = await Membership.findOne({ projectId, userId });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this project' });
      return;
    }

    res.json({
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        defaultLanguage: project.defaultLanguage,
        role: membership.role,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch project', message: err.message });
  }
}

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const { name, description, defaultLanguage } = req.body;

    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (defaultLanguage) project.defaultLanguage = defaultLanguage;

    await project.save();

    res.json({ message: 'Project updated', project });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project', message: err.message });
  }
}

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const project = await Project.findOne({ _id: projectId, deletedAt: null });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Soft delete
    project.deletedAt = new Date();
    await project.save();

    // Broadcast removal to all members
    const members = await Membership.find({ projectId });
    const gateway = getRealtimeGateway();
    if (gateway) {
      for (const m of members) {
        gateway.emitDirectoryProjectRemoved(m.userId.toString(), projectId);
      }
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete project', message: err.message });
  }
}

export async function getMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const members = await Membership.find({ projectId })
      .populate('userId', 'username email avatarColor')
      .sort({ joinedAt: 1 });

    const formatted = members.map((m) => ({
      userId: (m.userId as any)?._id,
      username: (m.userId as any)?.username,
      email: (m.userId as any)?.email,
      avatarColor: (m.userId as any)?.avatarColor || '#6366f1',
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    res.json({ members: formatted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get members', message: err.message });
  }
}

export async function updateMemberRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: projectId, userId: targetUserId } = req.params;
    const { role } = req.body;

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const membership = await Membership.findOne({ projectId, userId: targetUserId });
    if (!membership) {
      res.status(404).json({ error: 'Membership not found' });
      return;
    }

    membership.role = role;
    await membership.save();

    const gateway = getRealtimeGateway();
    if (gateway) {
      gateway.emitMemberRoleChanged(projectId, targetUserId, role);
    }

    res.json({ message: 'Role updated successfully', role });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update member role', message: err.message });
  }
}

export async function removeMember(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id: projectId, userId: targetUserId } = req.params;
    const currentUserId = req.user?.id;

    if (currentUserId === targetUserId) {
      res.status(400).json({ error: 'Cannot remove yourself as owner. Transfer ownership first.' });
      return;
    }

    const membership = await Membership.findOneAndDelete({ projectId, userId: targetUserId });
    if (!membership) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const gateway = getRealtimeGateway();
    if (gateway) {
      gateway.emitMemberLeft(projectId, targetUserId);
      gateway.emitDirectoryProjectRemoved(targetUserId, projectId);
    }

    res.json({ message: 'Member removed from project' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove member', message: err.message });
  }
}
