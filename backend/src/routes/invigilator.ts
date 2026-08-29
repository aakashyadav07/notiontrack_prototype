import { Router } from 'express';
import { requireAuth, requireAdmin, requireFacultyOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  generateInvigilatorAssignments,
  getInvigilatorJob,
  getInvigilatorAssignments,
  getInvigilatorAssignment,
  updateInvigilatorAssignment,
  getFacultyWorkload,
} from '../controllers/invigilator';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });
const jobIdParamSchema = z.object({ params: z.object({ jobId: z.string().cuid() }) });

const generateInvigilatorSchema = z.object({
  body: z.object({
    timetableId: z.string().cuid(),
    invigilatorRatio: z.number().int().positive().max(100).default(30),
    includeRelievers: z.boolean().default(true),
    relieverPercentage: z.number().int().min(0).max(50).default(10),
  }),
});

const invigilatorQuerySchema = z.object({
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

const updateAssignmentSchema = z.object({
  body: z.object({
    facultyId: z.string().cuid().optional(),
    role: z.enum(['CHIEF', 'INVIGILATOR', 'RELIEVER']).optional(),
    roomId: z.string().cuid().optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const workloadQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

router.use(requireAuth);

router.post('/generate', requireAdmin, validate(generateInvigilatorSchema), generateInvigilatorAssignments);
router.get('/jobs/:jobId', validate(jobIdParamSchema), getInvigilatorJob);
router.get('/assignments', requireFacultyOrAdmin, validate(invigilatorQuerySchema), getInvigilatorAssignments);
router.get('/assignments/:id', validate(idParamSchema), getInvigilatorAssignment);
router.put('/assignments/:id', requireAdmin, validate(updateAssignmentSchema), updateInvigilatorAssignment);
router.get('/workload', requireAdmin, validate(workloadQuerySchema), getFacultyWorkload);

export default router;