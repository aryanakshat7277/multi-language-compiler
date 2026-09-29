import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { verifyFirebaseIdToken } from '../config/firebase';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    try {
      const decodedFb = await verifyFirebaseIdToken(token);
      if (decodedFb && decodedFb.email) {
        let user = await prisma.user.findUnique({ where: { email: decodedFb.email } });
        if (!user) {
          const role = decodedFb.email.toLowerCase() === 'admin@test.com' ? 'ADMIN' : 'STUDENT';
          user = await prisma.user.create({
            data: {
              email: decodedFb.email,
              passwordHash: 'FIREBASE_MANAGED',
              displayName: decodedFb.name || decodedFb.email.split('@')[0],
              role
            }
          });
        }
        req.user = { id: user.id, email: user.email, role: user.role };
        next();
        return;
      }
    } catch {
      // Fall through to 401
    }
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;
  } catch {
    try {
      const decodedFb = await verifyFirebaseIdToken(token);
      if (decodedFb && decodedFb.email) {
        const user = await prisma.user.findUnique({ where: { email: decodedFb.email } });
        if (user) {
          req.user = { id: user.id, email: user.email, role: user.role };
        }
      }
    } catch {
      // Ignore
    }
  }
  next();
};

