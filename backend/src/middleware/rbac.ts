import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    if (roles.includes('ADMIN')) {
      const isMasterAdmin = req.user.email?.toLowerCase() === 'aryanakshat7277@gmail.com' && req.user.role === 'ADMIN';
      if (!isMasterAdmin) {
        res.status(403).json({ error: 'Forbidden: Administrator access restricted to authorized administrator account.' });
        return;
      }
    } else if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    
    next();
  };
};
