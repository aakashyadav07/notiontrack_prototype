import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { z } from 'zod';
import {
  createNotionReviewPage,
  updateNotionReview,
  getNotionReview,
  syncTimetableFromNotion,
} from '../controllers/notion';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.post(
  '/review',
  validateBody(z.object({
    timetableId: z.string().cuid(),
  })),
  createNotionReviewPage
);

router.patch(
  '/review',
  validateBody(z.object({
    timetableId: z.string().cuid(),
    status: z.enum(['Approved', 'Needs Changes', 'Published']),
    notes: z.string().optional(),
  })),
  updateNotionReview
);

router.get(
  '/review/:timetableId',
  validateParams(z.object({ timetableId: z.string().cuid() })),
  getNotionReview
);

router.post(
  '/sync/:timetableId',
  validateParams(z.object({ timetableId: z.string().cuid() })),
  syncTimetableFromNotion
);

export default router;