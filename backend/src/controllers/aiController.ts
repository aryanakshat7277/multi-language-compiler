import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { aiProvider } from '../services/ai/geminiProvider';
import { SimilarityService } from '../services/similarityService';

const resolveUserId = async (user?: any) => {
  if (user?.id) return user.id;
  const firstUser = await prisma.user.findFirst();
  return firstUser?.id || null;
};

export const reviewCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, languageId } = req.body;
    const result = await aiProvider.reviewCode(sourceCode, languageId);
    const userId = await resolveUserId(req.user);
    if (userId) await prisma.aiAnalysis.create({ data: { userId, type: 'REVIEW', sourceCode, languageId, result: result as any } });
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const explainCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, languageId, level } = req.body;
    const result = await aiProvider.explainCode(sourceCode, languageId, level || 'intermediate');
    const userId = await resolveUserId(req.user);
    if (userId) await prisma.aiAnalysis.create({ data: { userId, type: 'EXPLAIN', sourceCode, languageId, result: result as any } });
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const generateTests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { problemDescription, sourceCode, languageId } = req.body;
    const result = await aiProvider.generateTests(problemDescription, sourceCode, languageId);
    const userId = await resolveUserId(req.user);
    if (userId) await prisma.aiAnalysis.create({ data: { userId, type: 'GENERATE_TESTS', sourceCode, languageId, result: result as any } });
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const detectAi = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, languageId } = req.body;
    const result = await aiProvider.detectAiGenerated(sourceCode, languageId);
    const userId = await resolveUserId(req.user);
    if (userId) await prisma.aiAnalysis.create({ data: { userId, type: 'DETECT_AI', sourceCode, languageId, result: result as any } });
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const compareCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCodeA, sourceCodeB, languageId } = req.body;
    const result = await SimilarityService.calculateSimilarity(sourceCodeA, sourceCodeB, languageId);
    const userId = await resolveUserId(req.user);
    if (userId) {
      await prisma.similarityReport.create({
        data: { userId, sourceCodeA, sourceCodeB, languageId,
          lexicalScore: result.lexicalScore, structuralScore: result.structuralScore,
          astScore: result.astScore, semanticScore: result.semanticScore,
          algorithmScore: result.algorithmScore, overallScore: result.overallScore,
          explanation: result.explanation, details: result.details as any }
      });
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const getSimilarityReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const report = await prisma.similarityReport.findUnique({ where: { id } });
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    res.status(200).json(report);
  } catch (error) { next(error); }
};

export const debugCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, code, languageId, language, errorOutput, errorMessage } = req.body;
    const src = sourceCode || code || '';
    const lang = languageId || language || 'javascript';
    const error = errorOutput || errorMessage || '';
    if (!src) { res.status(400).json({ error: 'sourceCode is required' }); return; }
    const result = await aiProvider.debugCode(src, error, lang);
    const userId = await resolveUserId(req.user);
    if (userId) {
      await prisma.aiAnalysis.create({
        data: { userId, type: 'DEBUG', sourceCode: src, languageId: lang, result: result as any }
      });
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const generateShortestCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, languageId, expectedOutput } = req.body;
    if (!sourceCode) { res.status(400).json({ error: 'sourceCode is required' }); return; }
    const result = await aiProvider.generateShortestCode(sourceCode, languageId || 'javascript', expectedOutput);
    const userId = await resolveUserId(req.user);
    if (userId) {
      await prisma.aiAnalysis.create({
        data: { userId, type: 'REVIEW', sourceCode, languageId: languageId || 'javascript', result: result as any }
      });
    }
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const explainHover = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { word, lineContent, languageId, language } = req.body;
    if (!word) { res.status(400).json({ error: 'word is required' }); return; }
    const result = await aiProvider.explainHoverSymbol(word, lineContent || '', languageId || language || 'javascript');
    res.status(200).json(result);
  } catch (error) { next(error); }
};
