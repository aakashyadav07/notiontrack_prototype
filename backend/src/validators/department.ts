import { z } from 'zod';

export const createDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2).max(100),
    description: z.string().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase().optional(),
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const departmentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    sortBy: z.enum(['code', 'name', 'createdAt']).default('code'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});