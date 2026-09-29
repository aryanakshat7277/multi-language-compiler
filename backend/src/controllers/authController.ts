import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { verifyFirebaseIdToken } from '../config/firebase';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { broadcastToAdmin } from '../websocket/statusServer';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const token = await AuthService.register(email, passwordHash, displayName);
    const newUser = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, displayName: true, role: true, createdAt: true } });
    if (newUser) {
      broadcastToAdmin('USER_REGISTERED', newUser);
    }
    res.status(201).json({ token });
  } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const token = await AuthService.login(email, password);
    res.status(200).json({ token });
  } catch (error: any) {
    if (error.message === 'Invalid credentials') { res.status(401).json({ error: 'Invalid credentials' }); return; }
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, bio: true, createdAt: true }
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { ...(displayName && { displayName }), ...(bio !== undefined && { bio }), ...(avatarUrl && { avatarUrl }) },
      select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, bio: true }
    });
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const firebaseAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      res.status(400).json({ error: 'Firebase account has no associated email address' });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const isRoleAdmin = email.toLowerCase() === 'admin@test.com';
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: 'FIREBASE_MANAGED_' + Math.random().toString(36).substring(2),
          displayName: decoded.name || email.split('@')[0],
          role: isRoleAdmin ? 'ADMIN' : 'STUDENT',
          avatarUrl: decoded.picture || undefined
        }
      });
      broadcastToAdmin('USER_REGISTERED', {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: new Date().toISOString()
      });
    }

    const token = AuthService.generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error: any) {
    if (error.code?.startsWith('auth/') || error.message?.includes('Firebase')) {
      res.status(401).json({ error: error.message || 'Firebase authentication failed' });
      return;
    }
    next(error);
  }
};

