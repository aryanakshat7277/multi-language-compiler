import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = (req.query.search as string) || '';
    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { displayName: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, email: true, displayName: true, role: true, createdAt: true } }),
      prisma.user.count({ where })
    ]);
    res.status(200).json({ data: users, total, page, pageSize });
  } catch (error) { next(error); }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id },
      select: { id: true, email: true, displayName: true, role: true, avatarUrl: true, bio: true, createdAt: true, progress: true } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) { res.status(400).json({ error: 'Invalid role' }); return; }
    const user = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, email: true, role: true } });
    res.status(200).json(user);
  } catch (error) { next(error); }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { next(error); }
};
