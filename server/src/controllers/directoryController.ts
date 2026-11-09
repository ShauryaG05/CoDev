import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Membership } from '../models/Membership.js';
import { Project } from '../models/Project.js';
import { getRealtimeGateway } from '../sockets/gateway.js';

export async function getCloudDirectory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { search, sort = 'desc' } = req.query as { search?: string; sort?: string };

    // 1. Find all active memberships for this user
    const memberships = await Membership.find({ userId }).populate({
      path: 'projectId',
      match: { deletedAt: null },
    });

    const gateway = getRealtimeGateway();

    // 2. Extract valid populated projects
    const validMemberships = memberships.filter((m) => m.projectId != null);

    // Collect project IDs to batch-fetch avatars
    const projectIds = validMemberships.map((m) => (m.projectId as any)._id);

    // 3. Find top 5 member avatars for these projects
    const allProjectMembers = await Membership.find({
      projectId: { $in: projectIds },
    })
      .populate('userId', 'username avatarColor')
      .lean();

    const avatarsByProject = new Map<string, Array<{ username: string; avatarColor: string }>>();
    for (const m of allProjectMembers) {
      const pid = m.projectId.toString();
      if (!avatarsByProject.has(pid)) {
        avatarsByProject.set(pid, []);
      }
      const list = avatarsByProject.get(pid)!;
      if (list.length < 5 && m.userId && (m.userId as any).username) {
        list.push({
          username: (m.userId as any).username,
          avatarColor: (m.userId as any).avatarColor || '#6366f1',
        });
      }
    }

    const mine: any[] = [];
    const shared: any[] = [];

    for (const m of validMemberships) {
      const p: any = m.projectId;
      const pid = p._id.toString();

      // Search filter
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }

      const item = {
        id: pid,
        name: p.name,
        description: p.description,
        defaultLanguage: p.defaultLanguage,
        role: m.role,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        memberAvatars: avatarsByProject.get(pid) || [],
        onlineCount: gateway ? gateway.getOnlineCountForProject(pid) : 0,
      };

      if (m.role === 'owner') {
        mine.push(item);
      } else {
        shared.push(item);
      }
    }

    // Sort by updatedAt
    const sortMultiplier = sort === 'asc' ? 1 : -1;
    const sortByDate = (a: any, b: any) =>
      (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * sortMultiplier;

    mine.sort(sortByDate);
    shared.sort(sortByDate);

    res.json({
      mine,
      shared,
      totalCount: mine.length + shared.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load Cloud Directory', message: err.message });
  }
}
