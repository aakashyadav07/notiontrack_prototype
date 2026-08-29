import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import { prisma } from '../config/database';
import { notionService } from '../services/notion';

const createReviewPageSchema = z.object({
  timetableId: z.string().cuid(),
});

const updateReviewSchema = z.object({
  timetableId: z.string().cuid(),
  status: z.enum(['Approved', 'Needs Changes', 'Published']),
  notes: z.string().optional(),
});

const getReviewSchema = z.object({
  timetableId: z.string().cuid(),
});

export const createNotionReviewPage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { timetableId } = createReviewPageSchema.parse(req.body);

  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
  });

  if (!timetable) {
    throw new NotFoundError('Timetable', timetableId);
  }

  if (timetable.status === 'PUBLISHED') {
    throw new ConflictError('Cannot create review for already published timetable');
  }

  const result = await notionService.createTimetableReviewPage(timetableId);

  res.json(successResponse({
    message: 'Notion review page created successfully',
    notionPageId: result.id,
    notionPageUrl: result.url,
  }));
});

export const updateNotionReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { timetableId, status, notes } = updateReviewSchema.parse(req.body);

  await notionService.updateTimetableReviewStatus(timetableId, status, notes);

  res.json(successResponse({
    message: `Notion review status updated to ${status}`,
  }));
});

export const getNotionReview = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { timetableId } = getReviewSchema.parse(req.params);

  const review = await notionService.getTimetableReviewStatus(timetableId);

  if (!review) {
    throw new NotFoundError('Notion review', timetableId);
  }

  res.json(successResponse(review));
});

export const syncTimetableFromNotion = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { timetableId } = getReviewSchema.parse(req.params);

  await notionService.syncTimetableFromNotion(timetableId);

  res.json(successResponse({
    message: 'Timetable synced from Notion',
  }));
});