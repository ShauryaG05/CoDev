import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export interface UserTokenPayload {
  id: string;
  username: string;
  email: string;
}

export function generateAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
}

export function generateRefreshToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): UserTokenPayload {
  return jwt.verify(token, ENV.JWT_SECRET) as UserTokenPayload;
}

export function verifyRefreshToken(token: string): UserTokenPayload {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as UserTokenPayload;
}
