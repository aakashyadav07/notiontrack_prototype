import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department';

const router = Router();

const idParamSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
});

const createDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase(),
    name: z.string().min(2).max(100),
    description: z.string().optional(),
  }),
});

const updateDepartmentSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(10).toUpperCase().optional(),
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const departmentQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    sortBy: z.enum(['code', 'name', 'createdAt']).default('code'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

router.use(requireAuth);

router.post('/', requireAdmin, validate(createDepartmentSchema), createDepartment);
router.get('/', validate(departmentQuerySchema), getDepartments);
router.get('/:id', validate(idParamSchema), getDepartment);
router.put('/:id', requireAdmin, validate(updateDepartmentSchema), updateDepartment);
router.delete('/:id', requireAdmin, validate(idParamSchema), deleteDepartment);

export default router;