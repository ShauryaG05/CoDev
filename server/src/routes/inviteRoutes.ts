import { Router } from 'express';
import { acceptInvite } from '../controllers/inviteController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:token/accept', requireAuth, acceptInvite);

export default router;
