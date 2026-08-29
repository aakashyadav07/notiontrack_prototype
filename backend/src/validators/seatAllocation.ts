import { z } from 'zod';

export const generateSeatAllocationSchema = z.object({
  body: z.object({
    timetableId: z.string().cuid(),
    antiCheatingRules: z.object({
      separateSameSubject: z.boolean().default(true),
      separateSameSection: z.boolean().default(true),
      separateSameDepartment: z.boolean().default(false),
      minColumnGap: z.number().int().nonnegative().default(1),
    }).optional(),
  }),
});

export const seatAllocationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    timetableId: z.string().cuid().optional(),
    examId: z.string().cuid().optional(),
    roomId: z.string().cuid().optional(),
    studentId: z.string().cuid().optional(),
    sortBy: z.enum(['seatNumber', 'studentId', 'createdAt']).default('seatNumber'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export const seatAllocationIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const exportSeatAllocationSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  query: z.object({
    format: z.enum(['pdf', 'excel']).default('excel'),
  }),
});