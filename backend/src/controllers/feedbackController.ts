import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { broadcastToAdmin } from '../websocket/statusServer';
import { logger } from '../utils/logger';

/**
 * POST /api/feedback
 * Submit a bug report or feature improvement request (Available to all users, optional auth)
 */
export const createFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      type = 'BUG_REPORT', 
      section = 'General', 
      title, 
      description, 
      suggestedFix, 
      screenshotUrl, 
      severity = 'MEDIUM',
      userName,
      userEmail
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Title or subject is required.' });
      return;
    }

    if (!description || !description.trim()) {
      res.status(400).json({ error: 'Detailed description is required.' });
      return;
    }

    const authUser = (req as any).user;
    const finalUserId = authUser ? authUser.id : null;
    const finalUserName = authUser ? (authUser.displayName || authUser.email) : (userName?.trim() || 'Anonymous Developer');
    const finalUserEmail = authUser ? authUser.email : (userEmail?.trim() || 'anonymous@codeforge.local');

    // Normalize type and severity
    const normalizedType = ['BUG_REPORT', 'FEATURE_REQUEST', 'IMPROVEMENT'].includes(type) ? type : 'BUG_REPORT';
    const normalizedSeverity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity) ? severity : 'MEDIUM';

    const feedback = await prisma.feedback.create({
      data: {
        userId: finalUserId,
        userName: finalUserName,
        userEmail: finalUserEmail,
        type: normalizedType as any,
        section: section.trim() || 'General',
        title: title.trim(),
        description: description.trim(),
        suggestedFix: suggestedFix ? suggestedFix.trim() : null,
        screenshotUrl: screenshotUrl || null,
        severity: normalizedSeverity as any,
        status: 'PENDING'
      }
    });

    // Notify real-time connected administrators
    try {
      broadcastToAdmin('NEW_FEEDBACK_SUBMITTED', feedback);
    } catch (wsErr) {
      logger.warn('Failed to broadcast feedback event to admin:', wsErr);
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been safely submitted to the platform administrators.',
      feedback
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/feedback
 * Fetch all user submitted feedback & reports (RESTRICTED: ONLY ADMIN)
 */
export const getFeedbackList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, status, section, severity, search } = req.query;

    const where: any = {};

    if (type && type !== 'ALL') {
      where.type = String(type);
    }

    if (status && status !== 'ALL') {
      where.status = String(status);
    }

    if (section && section !== 'ALL') {
      where.section = String(section);
    }

    if (severity && severity !== 'ALL') {
      where.severity = String(severity);
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { section: { contains: q } },
        { userName: { contains: q } },
        { userEmail: { contains: q } },
        { suggestedFix: { contains: q } }
      ];
    }

    const [items, totalCount, pendingCount, bugCount, featureCount] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              role: true
            }
          }
        }
      }),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'PENDING' } }),
      prisma.feedback.count({ where: { type: 'BUG_REPORT' } }),
      prisma.feedback.count({ where: { type: 'FEATURE_REQUEST' } })
    ]);

    res.status(200).json({
      items,
      stats: {
        total: totalCount,
        pending: pendingCount,
        bugs: bugCount,
        features: featureCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/feedback/:id
 * Update feedback status & notes (RESTRICTED: ONLY ADMIN)
 */
export const updateFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, adminNotes } = req.body;

    const updateData: any = {};
    if (status && ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].includes(status)) {
      updateData.status = status;
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: updateData
    });

    try {
      broadcastToAdmin('FEEDBACK_STATUS_UPDATED', updated);
    } catch (wsErr) {
      logger.warn('Failed to broadcast feedback update to admin:', wsErr);
    }

    res.status(200).json({
      success: true,
      message: 'Feedback record updated successfully.',
      feedback: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/feedback/:id
 * Remove a feedback report (RESTRICTED: ONLY ADMIN)
 */
export const deleteFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.feedback.delete({
      where: { id }
    });

    try {
      broadcastToAdmin('FEEDBACK_DELETED', { id });
    } catch (wsErr) {
      logger.warn('Failed to broadcast feedback deletion to admin:', wsErr);
    }

    res.status(200).json({
      success: true,
      message: 'Feedback report deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/stats
 * Aggregate metrics and counts for feedback & issue reports
 */
export const getFeedbackStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [total, pending, bugs, features, resolved] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'PENDING' } }),
      prisma.feedback.count({ where: { type: 'BUG_REPORT' } }),
      prisma.feedback.count({ where: { type: 'FEATURE_REQUEST' } }),
      prisma.feedback.count({ where: { status: 'RESOLVED' } })
    ]);

    res.status(200).json({
      total,
      pending,
      bugs,
      features,
      resolved
    });
  } catch (error) {
    next(error);
  }
};
