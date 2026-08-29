import { z } from 'zod';

export const generateTimetableSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timeSlots: z.array(z.object({
      type: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
      start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    })).min(1, 'At least one time slot required'),
    roomIds: z.array(z.string().cuid()).min(1, 'At least one room required'),
    examIds: z.array(z.string().cuid()).optional(),
    constraints: z.object({
      maxExamsPerDayPerStudent: z.number().int().positive().max(3).default(2),
      minGapHours: z.number().int().nonnegative().default(2),
      invigilatorRatio: z.number().int().positive().max(100).default(30),
      preferredTimeSlots: z.array(z.string()).optional(),
      avoidConsecutiveDays: z.boolean().default(true),
    }).optional(),
  }),
});

export const publishTimetableSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const timetableQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['DRAFT', 'GENERATING', 'GENERATED', 'PUBLISHED', 'ARCHIVED']).optional(),
    sortBy: z.enum(['createdAt', 'name', 'startDate']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const timetableIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const resolveConflictSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
    conflictId: z.string().cuid(),
  }),
  body: z.object({
    action: z.enum(['MOVE_EXAM', 'CHANGE_ROOM', 'CHANGE_TIME', 'REMOVE_EXAM', 'IGNORE']),
    newRoomId: z.string().cuid().optional(),
    newDate: z.string().datetime().optional(),
    newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    newEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    notes: z.string().optional(),
  }),
});