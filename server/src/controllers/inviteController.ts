import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { Invite } from '../models/Invite.js';
import { Membership } from '../models/Membership.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getRealtimeGateway } from '../sockets/gateway.js';

export async function createInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;
    const { role = 'editor', expiresInDays = 7, maxUses = 0 } = req.body;

    if (!['editor', 'viewer'].includes(role)) {
      res.status(400).json({ error: 'Role must be editor or viewer' });
      return;
    }

    const token = uuidv4();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

    const invite = await Invite.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      token,
      role,
      createdBy: new mongoose.Types.ObjectId(userId),
      expiresAt,
      maxUses,
    });

    res.status(201).json({
      message: 'Invite created successfully',
      invite: {
        token: invite.token,
        role: invite.role,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create invite', message: err.message });
  }
}

export async function acceptInvite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required to accept invite' });
      return;
    }

    const invite = await Invite.findOne({ token, revoked: false });
    if (!invite) {
      res.status(404).json({ error: 'Invalid or revoked invite token' });
      return;
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      res.status(410).json({ error: 'Invite link has expired' });
      return;
    }

    if (invite.maxUses && invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      res.status(410).json({ error: 'Invite link has reached maximum usage limit' });
      return;
    }

    const project = await Project.findOne({ _id: invite.projectId, deletedAt: null });
    if (!project) {
      res.status(404).json({ error: 'Project no longer exists' });
      return;
    }

    // Check if user is already a member
    let membership = await Membership.findOne({ projectId: project._id, userId });
    if (membership) {
      res.json({
        message: 'You are already a member of this project',
        projectId: project._id,
        role: membership.role,
      });
      return;
    }

    // Create Membership
    membership = await Membership.create({
      projectId: project._id,
      userId: new mongoose.Types.ObjectId(userId),
      role: invite.role,
      invitedBy: invite.createdBy,
    });

    // Increment invite usage
    invite.uses += 1;
    await invite.save();

    // Log Activity
    await Activity.create({
      projectId: project._id,
      actorId: new mongoose.Types.ObjectId(userId),
      type: 'member.joined',
      payload: { role: invite.role },
    });

    const user = await User.findById(userId).select('username email avatarColor');

    // Realtime Notifications
    const gateway = getRealtimeGateway();
    if (gateway) {
      // 1. Push project card into invitee's Cloud Directory
      gateway.emitDirectoryProjectAdded(
        userId,
        {
          id: project._id,
          name: project.name,
          description: project.description,
          defaultLanguage: project.defaultLanguage,
          updatedAt: project.updatedAt,
        },
        invite.role
      );

      // 2. Broadcast to project room that a new member joined
      gateway.emitMemberJoined(
        project._id.toString(),
        {
          userId: user?._id,
          username: user?.username,
          avatarColor: user?.avatarColor,
        },
        invite.role
      );
    }

    res.json({
      message: 'Successfully joined project',
      projectId: project._id,
      role: invite.role,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to accept invite', message: err.message });
  }
}
