import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import { pythonClient } from '../utils/pythonClient';
import { jobQueue, JobType } from '../config/queue';

const conflictQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  timetableId: z.string().cuid().optional(),
  type: z.enum([
    'STUDENT_TIME_CONFLICT',
    'ROOM_DOUBLE_BOOKING',
    'FACULTY_DOUBLE_BOOKING',
    'ROOM_CAPACITY_EXCEEDED',
    'MISSING_ROOM',
    'MISSING_INVIGILATOR',
    'INVALID_TIME_SLOT',
    'DUPLICATE_ALLOCATION',
    'INVALID_REGISTRATION',
    'EXAM_OUTSIDE_PERIOD',
  ]).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  isResolved: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'type', 'severity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const detectConflictsSchema = z.object({
  timetableId: z.string().cuid(),
});

const resolveConflictSchema = z.object({
  action: z.enum(['MOVE_EXAM', 'CHANGE_ROOM', 'CHANGE_TIME', 'REMOVE_EXAM', 'IGNORE', 'MANUAL_FIX']),
  newRoomId: z.string().cuid().optional(),
  newDate: z.string().datetime().optional(),
  newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  newEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  notes: z.string().optional(),
});

export const getConflicts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = conflictQuerySchema.parse(req.query);
  const { page, limit, timetableId, type, severity, isResolved, sortBy, sortOrder } = query;

  const where: any = {};
  if (timetableId) where.timetableId = timetableId;
  if (type) where.type = type;
  if (severity) where.severity = severity;
  if (typeof isResolved === 'boolean') where.isResolved = isResolved;

  const [conflicts, total] = await Promise.all([
    prisma.conflict.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { timetable: { select: { id: true, name: true } } },
    }),
    prisma.conflict.count({ where }),
  ]);

  res.json(paginatedResponse(conflicts, page, limit, total));
});

export const getConflict = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const conflict = await prisma.conflict.findUnique({
    where: { id },
    include: { timetable: { select: { id: true, name: true } } },
  });

  if (!conflict) throw new NotFoundError('Conflict', id);

  res.json(successResponse(conflict));
});

export const detectConflicts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const data = detectConflictsSchema.parse(req.body);

  const timetable = await prisma.timetable.findUnique({
    where: { id: data.timetableId },
    include: {
      entries: {
        include: { exam: { include: { subject: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', data.timetableId);

  const jobId = jobQueue.enqueue('CONFLICT_DETECTION', {
    timetableId: data.timetableId,
  });

  res.status(202).json(successResponse({ jobId, status: 'processing' }));
});

export const resolveConflict = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = resolveConflictSchema.parse(req.body);
  const authReq = req as any;

  const conflict = await prisma.conflict.findUnique({ where: { id } });
  if (!conflict) throw new NotFoundError('Conflict', id);
  if (conflict.isResolved) throw new ConflictError('Conflict already resolved');

  if (data.action === 'IGNORE') {
    await prisma.conflict.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date(), resolvedBy: authReq.user.userId, metadata: { ...(conflict.metadata as object ?? {}), resolution: data } },
    });
    res.json(successResponse({ message: 'Conflict marked as ignored' }));
    return;
  }

  if (conflict.entityType === 'Exam' && conflict.relatedEntityType === 'Room' && data.newRoomId && conflict.relatedEntityId) {
    const entry = await prisma.timetableEntry.findFirst({
      where: { timetableId: conflict.timetableId!, examId: conflict.entityId, roomId: conflict.relatedEntityId },
    });
    if (entry) {
      await prisma.timetableEntry.update({
        where: { id: entry.id },
        data: { roomId: data.newRoomId },
      });
    }
  }

  if (conflict.entityType === 'Exam' && data.newDate && data.newStartTime && data.newEndTime) {
    const entry = await prisma.timetableEntry.findFirst({
      where: { timetableId: conflict.timetableId!, examId: conflict.entityId },
    });
    if (entry) {
      await prisma.timetableEntry.update({
        where: { id: entry.id },
        data: {
          date: new Date(data.newDate),
          startTime: new Date(`${data.newDate}T${data.newStartTime}`),
          endTime: new Date(`${data.newDate}T${data.newEndTime}`),
        },
      });
    }
  }

  await prisma.conflict.update({
    where: { id },
    data: { isResolved: true, resolvedAt: new Date(), resolvedBy: authReq.user.userId, metadata: { ...(conflict.metadata as object ?? {}), resolution: data } },
  });

  res.json(successResponse({ message: 'Conflict resolved successfully' }));
});

export const getConflictStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { timetableId } = req.query;

  const where = timetableId ? { timetableId: timetableId as string } : {};

  const [total, byType, bySeverity, resolved, unresolved] = await Promise.all([
    prisma.conflict.count({ where }),
    prisma.conflict.groupBy({ by: ['type'], where, _count: true }),
    prisma.conflict.groupBy({ by: ['severity'], where, _count: true }),
    prisma.conflict.count({ where: { ...where, isResolved: true } }),
    prisma.conflict.count({ where: { ...where, isResolved: false } }),
  ]);

  res.json(successResponse({
    total,
    byType: byType.reduce((acc: Record<string, number>, item) => ({ ...acc, [item.type]: item._count }), {}),
    bySeverity: bySeverity.reduce((acc: Record<string, number>, item) => ({ ...acc, [item.severity]: item._count }), {}),
    resolved,
    unresolved,
  }));
});