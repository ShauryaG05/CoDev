import { Router } from 'express';
import { getCloudDirectory } from '../controllers/directoryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/directory', requireAuth, getCloudDirectory);

export default router;
