import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  generateSeatAllocation,
  getSeatAllocationJob,
  getSeatAllocations,
  getSeatAllocation,
  exportSeatAllocation,
  regenerateSeatAllocation,
} from '../controllers/seatAllocation';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });
const jobIdParamSchema = z.object({ params: z.object({ jobId: z.string().cuid() }) });

const generateSeatAllocationSchema = z.object({
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

const seatAllocationQuerySchema = z.object({
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

const exportSchema = z.object({
  query: z.object({
    format: z.enum(['pdf', 'excel']).default('excel'),
  }),
  params: z.object({ id: z.string().cuid() }),
});

router.use(requireAuth);

router.post('/generate', requireAdmin, validate(generateSeatAllocationSchema), generateSeatAllocation);
router.get('/jobs/:jobId', validate(jobIdParamSchema), getSeatAllocationJob);
router.get('/', validate(seatAllocationQuerySchema), getSeatAllocations);
router.get('/:id', validate(idParamSchema), getSeatAllocation);
router.get('/:id/export', validate(exportSchema), exportSeatAllocation);
router.post('/:id/regenerate', requireAdmin, validate(idParamSchema), regenerateSeatAllocation);

export default router;