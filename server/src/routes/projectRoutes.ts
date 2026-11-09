import { Router } from 'express';
import {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getMembers,
  updateMemberRole,
  removeMember,
} from '../controllers/projectController.js';
import {
  getTree,
  createNode,
  updateNode,
  deleteNode,
} from '../controllers/nodeController.js';
import { createInvite } from '../controllers/inviteController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMembership } from '../middleware/permissions.js';

const router = Router();

router.use(requireAuth);

// Project lifecycle
router.post('/', createProject);
router.get('/:id', requireMembership('viewer'), getProject);
router.patch('/:id', requireMembership('owner'), updateProject);
router.delete('/:id', requireMembership('owner'), deleteProject);

// Members
router.get('/:id/members', requireMembership('viewer'), getMembers);
router.patch('/:id/members/:userId', requireMembership('owner'), updateMemberRole);
router.delete('/:id/members/:userId', requireMembership('owner'), removeMember);

// File Tree & Nodes
router.get('/:id/tree', requireMembership('viewer'), getTree);
router.post('/:id/nodes', requireMembership('editor'), createNode);
router.patch('/:id/nodes/:nodeId', requireMembership('editor'), updateNode);
router.delete('/:id/nodes/:nodeId', requireMembership('editor'), deleteNode);

// Invites
router.post('/:id/invites', requireMembership('owner'), createInvite);

export default router;
