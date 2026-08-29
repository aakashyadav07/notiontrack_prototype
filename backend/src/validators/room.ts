import { z } from 'zod';

export const createRoomSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(20).toUpperCase(),
    name: z.string().min(2).max(100),
    capacity: z.number().int().positive().max(1000),
    departmentId: z.string().cuid().optional(),
    floor: z.number().int().optional(),
    building: z.string().max(50).optional(),
    hasProjector: z.boolean().default(false),
    hasAC: z.boolean().default(false),
    isAccessible: z.boolean().default(false),
  }),
});

export const updateRoomSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(20).toUpperCase().optional(),
    name: z.string().min(2).max(100).optional(),
    capacity: z.number().int().positive().max(1000).optional(),
    departmentId: z.string().cuid().optional(),
    floor: z.number().int().optional(),
    building: z.string().max(50).optional(),
    hasProjector: z.boolean().optional(),
    hasAC: z.boolean().optional(),
    isAccessible: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const roomQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    departmentId: z.string().cuid().optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
    maxCapacity: z.coerce.number().int().positive().optional(),
    isActive: z.coerce.boolean().optional(),
    sortBy: z.enum(['code', 'capacity', 'createdAt']).default('code'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

export const roomIdParamSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const seatLayoutSchema = z.object({
  body: z.object({
    rows: z.number().int().positive().max(50),
    columns: z.number().int().positive().max(50),
    layout: z.record(z.unknown()).optional(),
  }),
  params: z.object({
    id: z.string().cuid(),
  }),
});