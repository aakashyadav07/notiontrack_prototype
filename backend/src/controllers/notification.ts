import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../utils/errors';
import { z } from 'zod';

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  isRead: z.coerce.boolean().optional(),
  type: z.enum([
    'TIMETABLE_PUBLISHED',
    'EXAM_SCHEDULE_CHANGED',
    'ROOM_CHANGED',
    'SEAT_ALLOCATION_PUBLISHED',
    'CONFLICT_DETECTED',
    'ADMIN_ALERT',
    'SYSTEM',
  ]).optional(),
  sortBy: z.enum(['createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

export const getNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const query = notificationQuerySchema.parse(req.query);
  const { page, limit, isRead, type, sortBy, sortOrder } = query;

  const where: any = { userId: authReq.user.userId };
  if (typeof isRead === 'boolean') where.isRead = isRead;
  if (type) where.type = type;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.notification.count({ where }),
  ]);

  res.json(paginatedResponse(notifications, page, limit, total));
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;

  const count = await prisma.notification.count({
    where: { userId: authReq.user.userId, isRead: false },
  });

  res.json(successResponse({ count }));
});

export const markAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: authReq.user.userId },
  });

  if (!notification) throw new NotFoundError('Notification', id);

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });

  res.json(successResponse(updated));
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;

  await prisma.notification.updateMany({
    where: { userId: authReq.user.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  res.json(successResponse({ message: 'All notifications marked as read' }));
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const { id } = req.params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: authReq.user.userId },
  });

  if (!notification) throw new NotFoundError('Notification', id);

  await prisma.notification.delete({ where: { id } });

  res.json(successResponse({ message: 'Notification deleted' }));
});