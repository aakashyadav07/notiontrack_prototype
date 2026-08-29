import { Router } from 'express';
import { requireAuth, requireAdmin, requireFacultyOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  createFaculty,
  getFaculty,
  getFacultyMember,
  updateFaculty,
  deleteFaculty,
  getFacultyAssignments,
} from '../controllers/faculty';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const createFacultySchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    employeeId: z.string().min(3).max(20).toUpperCase(),
    departmentId: z.string().cuid(),
    designation: z.string().min(2).max(50),
    maxWorkload: z.number().int().positive().max(10).default(4),
  }),
});

const updateFacultySchema = z.object({
  body: z.object({
    employeeId: z.string().min(3).max(20).toUpperCase().optional(),
    departmentId: z.string().cuid().optional(),
    designation: z.string().min(2).max(50).optional(),
    maxWorkload: z.number().int().positive().max(10).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const facultyQuerySchema = z.object({
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

const assignmentQuerySchema = z.object({
  query: z.object({
    date: z.string().datetime().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

router.use(requireAuth);

router.post('/', requireAdmin, validate(createFacultySchema), createFaculty);
router.get('/', requireFacultyOrAdmin, validate(facultyQuerySchema), getFaculty);
router.get('/:id', validate(idParamSchema), getFacultyMember);
router.put('/:id', requireAdmin, validate(updateFacultySchema), updateFaculty);
router.delete('/:id', requireAdmin, validate(idParamSchema), deleteFaculty);
router.get('/:id/assignments', validate(idParamSchema.merge(assignmentQuerySchema)), getFacultyAssignments);

export default router;