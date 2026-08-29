import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/subject';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const createSubjectSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(15).toUpperCase(),
    name: z.string().min(2).max(100),
    departmentId: z.string().cuid(),
    credits: z.number().int().positive().max(6).default(3),
    examDuration: z.number().int().positive().max(300).default(180),
  }),
});

const updateSubjectSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(15).toUpperCase().optional(),
    name: z.string().min(2).max(100).optional(),
    departmentId: z.string().cuid().optional(),
    credits: z.number().int().positive().max(6).optional(),
    examDuration: z.number().int().positive().max(300).optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const subjectQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    departmentId: z.string().cuid().optional(),
    sortBy: z.enum(['code', 'name', 'createdAt']).default('code'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

router.use(requireAuth);

router.post('/', requireAdmin, validate(createSubjectSchema), createSubject);
router.get('/', validate(subjectQuerySchema), getSubjects);
router.get('/:id', validate(idParamSchema), getSubject);
router.put('/:id', requireAdmin, validate(updateSubjectSchema), updateSubject);
router.delete('/:id', requireAdmin, validate(idParamSchema), deleteSubject);

export default router;