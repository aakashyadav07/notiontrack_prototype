import { z } from 'zod';

export const reportQuerySchema = z.object({
  query: z.object({
    timetableId: z.string().cuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    departmentId: z.string().cuid().optional(),
    format: z.enum(['json', 'pdf', 'excel']).default('json'),
  }),
});

export const dashboardQuerySchema = z.object({
  query: z.object({
    timetableId: z.string().cuid().optional(),
  }),
});