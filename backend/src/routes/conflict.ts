import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  getConflicts,
  getConflict,
  detectConflicts,
  resolveConflict,
  getConflictStats,
} from '../controllers/conflict';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const conflictQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    timetableId: z.string().cuid().optional(),
    type: z.enum([
      'STUDENT_TIME_CONFLICT',
      'ROOM_DOUBLE_BOOKING',
      'FACULTY_DOUBLE_BOOKING',
      'ROOM_CAPACITY_EXCEEDED',
      'MISSING_ROOM',
      'MISSING_INVIGILATOR',
      'INVALID_TIME_SLOT',
      'DUPLICATE_ALLOCATION',
      'INVALID_REGISTRATION',
      'EXAM_OUTSIDE_PERIOD',
    ]).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    isResolved: z.coerce.boolean().optional(),
    sortBy: z.enum(['createdAt', 'type', 'severity']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

const detectConflictsSchema = z.object({
  body: z.object({
    timetableId: z.string().cuid(),
  }),
});

const resolveConflictSchema = z.object({
  body: z.object({
    action: z.enum(['MOVE_EXAM', 'CHANGE_ROOM', 'CHANGE_TIME', 'REMOVE_EXAM', 'IGNORE', 'MANUAL_FIX']),
    newRoomId: z.string().cuid().optional(),
    newDate: z.string().datetime().optional(),
    newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    newEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

router.use(requireAuth);

router.get('/', validate(conflictQuerySchema), getConflicts);
router.get('/stats', requireAdmin, getConflictStats);
router.get('/:id', validate(idParamSchema), getConflict);
router.post('/detect', requireAdmin, validate(detectConflictsSchema), detectConflicts);
router.post('/:id/resolve', requireAdmin, validate(resolveConflictSchema), resolveConflict);

export default router;