import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  generateTimetable,
  getTimetableJob,
  getTimetables,
  getTimetable,
  publishTimetable,
  getTimetableConflicts,
  resolveConflict,
  regenerateTimetable,
} from '../controllers/timetable';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });
const jobIdParamSchema = z.object({ params: z.object({ jobId: z.string().cuid() }) });
const conflictParamSchema = z.object({ params: z.object({ id: z.string().cuid(), conflictId: z.string().cuid() }) });

const generateTimetableSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100),
    description: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timeSlots: z.array(z.object({
      type: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
      start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    })).min(1),
    roomIds: z.array(z.string().cuid()).min(1),
    examIds: z.array(z.string().cuid()).optional(),
    constraints: z.object({
      maxExamsPerDayPerStudent: z.number().int().positive().max(3).default(2),
      minGapHours: z.number().int().nonnegative().default(2),
      invigilatorRatio: z.number().int().positive().max(100).default(30),
      preferredTimeSlots: z.array(z.string()).optional(),
      avoidConsecutiveDays: z.boolean().default(true),
    }).optional(),
  }),
});

const timetableQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['DRAFT', 'GENERATING', 'GENERATED', 'PUBLISHED', 'ARCHIVED']).optional(),
    sortBy: z.enum(['createdAt', 'name', 'startDate']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

const resolveConflictSchema = z.object({
  body: z.object({
    action: z.enum(['MOVE_EXAM', 'CHANGE_ROOM', 'CHANGE_TIME', 'REMOVE_EXAM', 'IGNORE']),
    newRoomId: z.string().cuid().optional(),
    newDate: z.string().datetime().optional(),
    newStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    newEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    notes: z.string().optional(),
  }),
  params: z.object({ id: z.string().cuid(), conflictId: z.string().cuid() }),
});

router.use(requireAuth);

router.post('/generate', requireAdmin, validate(generateTimetableSchema), generateTimetable);
router.get('/jobs/:jobId', validate(jobIdParamSchema), getTimetableJob);
router.get('/', validate(timetableQuerySchema), getTimetables);
router.get('/:id', validate(idParamSchema), getTimetable);
router.post('/:id/publish', requireAdmin, validate(idParamSchema), publishTimetable);
router.post('/:id/regenerate', requireAdmin, validate(idParamSchema), regenerateTimetable);
router.get('/:id/conflicts', validate(idParamSchema), getTimetableConflicts);
router.post('/:id/conflicts/:conflictId/resolve', requireAdmin, validate(conflictParamSchema.merge(resolveConflictSchema)), resolveConflict);

export default router;