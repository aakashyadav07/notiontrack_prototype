import { Router } from 'express';
import { requireAuth, requireAdmin, requireFacultyOrAdmin, requireOwnershipOrAdmin, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getStudentTimetable,
  getStudentSeatAllocation,
} from '../controllers/student';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const createStudentSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    studentId: z.string().min(3).max(20).toUpperCase(),
    departmentId: z.string().cuid(),
    semester: z.number().int().min(1).max(10),
    section: z.string().max(5).optional(),
  }),
});

const updateStudentSchema = z.object({
  body: z.object({
    studentId: z.string().min(3).max(20).toUpperCase().optional(),
    departmentId: z.string().cuid().optional(),
    semester: z.number().int().min(1).max(10).optional(),
    section: z.string().max(5).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const studentQuerySchema = z.object({
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

router.use(requireAuth);

router.post('/', requireAdmin, validate(createStudentSchema), createStudent);
router.get('/', requireFacultyOrAdmin, validate(studentQuerySchema), getStudents);
router.get('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    await requireOwnershipOrAdmin(req, res, next, req.params.id);
  } catch {
    if (req.user?.role === 'FACULTY') return next();
    throw new Error('Forbidden');
  }
}, getStudent);
router.put('/:id', requireAdmin, validate(updateStudentSchema), updateStudent);
router.delete('/:id', requireAdmin, validate(idParamSchema), deleteStudent);
router.get('/:id/timetable', validate(idParamSchema), getStudentTimetable);
router.get('/:id/seat-allocation', validate(idParamSchema), getStudentSeatAllocation);

export default router;