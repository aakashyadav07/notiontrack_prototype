import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  registerStudents,
  unregisterStudents,
} from '../controllers/exam';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const createExamSchema = z.object({
  body: z.object({
    subjectId: z.string().cuid(),
    examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).default('REGULAR'),
    duration: z.number().int().positive().max(300),
    maxStudents: z.number().int().positive().optional(),
  }),
});

const updateExamSchema = z.object({
  body: z.object({
    subjectId: z.string().cuid().optional(),
    examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).optional(),
    duration: z.number().int().positive().max(300).optional(),
    maxStudents: z.number().int().positive().optional(),
    status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const examQuerySchema = z.object({
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

const registrationSchema = z.object({
  body: z.object({
    studentIds: z.array(z.string().cuid()).min(1),
  }),
  params: z.object({ id: z.string().cuid() }),
});

router.use(requireAuth);

router.post('/', requireAdmin, validate(createExamSchema), createExam);
router.get('/', validate(examQuerySchema), getExams);
router.get('/:id', validate(idParamSchema), getExam);
router.put('/:id', requireAdmin, validate(updateExamSchema), updateExam);
router.delete('/:id', requireAdmin, validate(idParamSchema), deleteExam);
router.post('/:id/register', requireAdmin, validate(registrationSchema), registerStudents);
router.delete('/:id/register', requireAdmin, validate(registrationSchema), unregisterStudents);

export default router;