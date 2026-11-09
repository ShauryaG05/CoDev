import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, UserTokenPayload } from '../utils/tokens.js';

export interface AuthenticatedRequest extends Request {
  user?: UserTokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. No Bearer token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired token', message: err.message });
  }
}
