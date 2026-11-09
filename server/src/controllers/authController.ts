import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899'];

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(6),
});

const LoginSchema = z.object({
  identifier: z.string().min(1), // email or username
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    console.log("Hey")
    const parse = RegisterSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
      return;
    }

    const { email, username, password } = parse.data;

    // Check duplicate email or username
    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existing) {
      res.status(409).json({ error: 'User with this email or username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
      avatarColor,
    });

    const payload = { id: user._id.toString(), username: user.username, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatarColor: user.avatarColor,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    console.log("Hey")
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
      return;
    }

    const { identifier, password } = parse.data;
    const lowerIdent = identifier.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: lowerIdent }, { username: lowerIdent }],
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email/username or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email/username or password' });
      return;
    }

    const payload = { id: user._id.toString(), username: user.username, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatarColor: user.avatarColor,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user', message: err.message });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.body.refreshToken;
    if (!token) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const payload = verifyRefreshToken(token);
    const newAccessToken = generateAccessToken({
      id: payload.id,
      username: payload.username,
      email: payload.email,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}
