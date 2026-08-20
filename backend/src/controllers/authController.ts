import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const token = await AuthService.register(email, passwordHash, displayName);
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
