import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { Membership, MembershipRole } from '../models/Membership.js';
import mongoose from 'mongoose';

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export interface ProjectAuthorizedRequest extends AuthenticatedRequest {
  membership?: {
    projectId: string;
    userId: string;
    role: MembershipRole;
  };
}

export function requireMembership(minRole: MembershipRole = 'viewer') {
  return async (req: ProjectAuthorizedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized. User context missing.' });
        return;
      }

      const projectId = req.params.projectId || req.params.id || req.body.projectId;
      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400).json({ error: 'Invalid or missing project ID.' });
        return;
      }

      const membership = await Membership.findOne({ projectId, userId });
      if (!membership) {
        res.status(403).json({ error: 'Forbidden. You are not a member of this project.' });
        return;
      }

      const userRoleRank = ROLE_HIERARCHY[membership.role] || 0;
      const requiredRoleRank = ROLE_HIERARCHY[minRole] || 0;

      if (userRoleRank < requiredRoleRank) {
        res.status(403).json({
          error: `Forbidden. Insufficient permissions. Requires at least '${minRole}' role, but your role is '${membership.role}'.`,
        });
        return;
      }

      req.membership = {
        projectId: membership.projectId.toString(),
        userId: membership.userId.toString(),
        role: membership.role,
      };

      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Permission check failed', message: err.message });
    }
  };
}

export async function checkRole(userId: string, projectId: string): Promise<MembershipRole | null> {
  const membership = await Membership.findOne({ projectId, userId });
  return membership ? membership.role : null;
}
