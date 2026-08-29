import { Router } from 'express';
import { requireAuth, requireAdmin, requireFacultyOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  getDashboard,
  getTimetableReport,
  getRoomUtilizationReport,
  getSeatAllocationReport,
  getConflictReport,
  getFacultyWorkloadReport,
  getExamStatistics,
} from '../controllers/report';

const router = Router();

const reportQuerySchema = z.object({
  query: z.object({
    timetableId: z.string().cuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    departmentId: z.string().cuid().optional(),
    format: z.enum(['json', 'pdf', 'excel']).default('json'),
  }),
});

const dashboardQuerySchema = z.object({
  query: z.object({
    timetableId: z.string().cuid().optional(),
  }),
});

router.use(requireAuth);

router.get('/dashboard', validate(dashboardQuerySchema), getDashboard);
router.get('/timetable', validate(reportQuerySchema), getTimetableReport);
router.get('/rooms', requireFacultyOrAdmin, validate(reportQuerySchema), getRoomUtilizationReport);
router.get('/seat-allocation', validate(reportQuerySchema), getSeatAllocationReport);
router.get('/conflicts', requireAdmin, validate(reportQuerySchema), getConflictReport);
router.get('/faculty-workload', requireAdmin, validate(reportQuerySchema), getFacultyWorkloadReport);
router.get('/exam-statistics', validate(reportQuerySchema), getExamStatistics);

export default router;