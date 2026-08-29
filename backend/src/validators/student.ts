import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    studentId: z.string().min(3).max(20).toUpperCase(),
    departmentId: z.string().cuid(),
    semester: z.number().int().min(1).max(10),
    section: z.string().max(5).optional(),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    studentId: z.string().min(3).max(20).toUpperCase().optional(),
    departmentId: z.string().cuid().optional(),
    semester: z.number().int().min(1).max(10).optional(),
    section: z.string().max(5).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const studentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    departmentId: z.string().cuid().optional(),
    semester: z.coerce.number().int().min(1).max(10).optional(),
    section: z.string().optional(),
    sortBy: z.enum(['studentId', 'createdAt', 'semester']).default('studentId'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export const studentIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});