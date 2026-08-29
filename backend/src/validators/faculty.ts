import { z } from 'zod';

export const createFacultySchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    employeeId: z.string().min(3).max(20).toUpperCase(),
    departmentId: z.string().cuid(),
    designation: z.string().min(2).max(50),
    maxWorkload: z.number().int().positive().max(10).default(4),
  }),
});

export const updateFacultySchema = z.object({
  body: z.object({
    employeeId: z.string().min(3).max(20).toUpperCase().optional(),
    departmentId: z.string().cuid().optional(),
    designation: z.string().min(2).max(50).optional(),
    maxWorkload: z.number().int().positive().max(10).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const facultyQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    departmentId: z.string().cuid().optional(),
    designation: z.string().optional(),
    sortBy: z.enum(['employeeId', 'designation', 'createdAt']).default('employeeId'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export const facultyIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});