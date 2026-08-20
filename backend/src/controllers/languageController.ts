import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const getLanguages = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const languages = await prisma.language.findMany({ where: { enabled: true }, orderBy: { displayName: 'asc' } });
    res.status(200).json(languages);
  } catch (error) { next(error); }
};

export const getLanguageById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const language = await prisma.language.findUnique({ where: { id } });
    if (!language) { res.status(404).json({ error: 'Language not found' }); return; }
    res.status(200).json(language);
  } catch (error) { next(error); }
};

export const updateLanguage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const language = await prisma.language.update({ where: { id }, data: req.body });
    res.status(200).json(language);
  } catch (error) { next(error); }
};
