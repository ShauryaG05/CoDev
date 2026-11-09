import { Router } from 'express';
import authRoutes from './authRoutes.js';
import directoryRoutes from './directoryRoutes.js';
import projectRoutes from './projectRoutes.js';
import inviteRoutes from './inviteRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', directoryRoutes);
router.use('/projects', projectRoutes);
router.use('/invites', inviteRoutes);

export default router;
