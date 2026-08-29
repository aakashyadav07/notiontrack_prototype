import { z } from 'zod';

export const createExamSchema = z.object({
  body: z.object({
    subjectId: z.string().cuid(),
    examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).default('REGULAR'),
    duration: z.number().int().positive().max(300),
    maxStudents: z.number().int().positive().optional(),
  }),
});

export const updateExamSchema = z.object({
  body: z.object({
    subjectId: z.string().cuid().optional(),
    examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).optional(),
    duration: z.number().int().positive().max(300).optional(),
    maxStudents: z.number().int().positive().optional(),
    status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const examQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    subjectId: z.string().cuid().optional(),
    examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).optional(),
    status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
    sortBy: z.enum(['createdAt', 'examType', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const examIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const examRegistrationSchema = z.object({
  body: z.object({
    studentIds: z.array(z.string().cuid()).min(1, 'At least one student required'),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});