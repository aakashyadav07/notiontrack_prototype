import { z } from 'zod';

export const generateInvigilatorAssignmentSchema = z.object({
  body: z.object({
    timetableId: z.string().cuid(),
    invigilatorRatio: z.number().int().positive().max(100).default(30),
    includeRelievers: z.boolean().default(true),
    relieverPercentage: z.number().int().min(0).max(50).default(10),
  }),
});

export const invigilatorAssignmentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    facultyId: z.string().cuid().optional(),
    examId: z.string().cuid().optional(),
    date: z.string().datetime().optional(),
    role: z.enum(['CHIEF', 'INVIGILATOR', 'RELIEVER']).optional(),
    sortBy: z.enum(['date', 'facultyId', 'createdAt']).default('date'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export const updateInvigilatorAssignmentSchema = z.object({
  body: z.object({
    facultyId: z.string().cuid().optional(),
    role: z.enum(['CHIEF', 'INVIGILATOR', 'RELIEVER']).optional(),
    roomId: z.string().cuid().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});