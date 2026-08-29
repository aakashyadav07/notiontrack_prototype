import { z } from 'zod';

export const notificationQuerySchema = z.object({
  query: z.object({
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
      'SYSTEM'
    ]).optional(),
    sortBy: z.enum(['createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});