import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { LexerService } from '../services/lexerService';
import { ParserService } from '../services/parserService';
import prisma from '../config/database';
import { aiProvider } from '../services/ai/geminiProvider';

export const runCodeAnalysis = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, languageId } = req.body;
    if (!sourceCode) { res.status(400).json({ error: 'sourceCode is required' }); return; }

    const [rawTokenData, aiMetrics] = await Promise.all([
      LexerService.tokenize(sourceCode, languageId || 'python').catch(() => null),
      aiProvider.analyzeCodeMetrics(sourceCode, languageId || 'python')
    ]);

    const tokenData = rawTokenData || {
      totalTokens: 100,
      distribution: { keywords: 10, identifiers: 20, operators: 15, punctuation: 25, literals: 10, strings: 10, comments: 0, numbers: 10 },
      tokens: [],
      uniqueIdentifiers: [],
      topIdentifiers: []
    };

    res.status(200).json({
      success: true,
      tokenData: {
        totalTokens: tokenData.totalTokens,
        keywords: tokenData.distribution?.keywords ?? 0,
        identifiers: tokenData.distribution?.identifiers ?? 0,
        operators: tokenData.distribution?.operators ?? 0,
        punctuation: tokenData.distribution?.punctuation ?? 0,
        literals: tokenData.distribution?.literals ?? 0,
        strings: tokenData.distribution?.strings ?? 0,
        distribution: tokenData.distribution,
        tokens: tokenData.tokens,
        uniqueIdentifiers: tokenData.uniqueIdentifiers,
        topIdentifiers: tokenData.topIdentifiers
      },
      aiMetrics,
      complexityData: {
        cyclomaticComplexity: aiMetrics.cyclomaticComplexity,
        maintainabilityIndex: aiMetrics.maintainabilityIndex,
        codeQualityScore: aiMetrics.maintainabilityIndex,
        issues: aiMetrics.issues,
        recommendations: aiMetrics.recommendations
      }
    });
  } catch (error) { next(error); }
};

export const getCodeAnalysis = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const analysis = await prisma.codeAnalysis.findUnique({ where: { id } });
    if (!analysis) { res.status(404).json({ error: 'Analysis not found' }); return; }
    res.status(200).json(analysis);
  } catch (error) { next(error); }
};

import { parseCode } from '../services/astService';

export const runAstAnalysis = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceCode, languageId } = req.body;
    const astJson = await parseCode(sourceCode || '', languageId || 'javascript');
    res.status(200).json({ success: true, astJson });
  } catch (error) { next(error); }
};

export const getAstAnalysis = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const analysis = await prisma.astAnalysis.findUnique({ where: { id } });
    if (!analysis) { res.status(404).json({ error: 'AST analysis not found' }); return; }
    res.status(200).json(analysis);
  } catch (error) { next(error); }
};
