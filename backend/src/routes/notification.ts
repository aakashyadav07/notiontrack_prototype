import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const notificationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    isRead: z.coerce.boolean().optional(),
    type: z.enum([
      'TIMETABLE_PUBLISHED',
      'EXAM_SCHEDULE_CHANGED',
      'ROOM_CHANGED',
      'SEAT_ALLOCATION_PUBLISHED',
      'CONFLICT_DETECTED',
      'ADMIN_ALERT',
      'SYSTEM',
    ]).optional(),
    sortBy: z.enum(['createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

router.use(requireAuth);

router.get('/', validate(notificationQuerySchema), getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/:id/read', validate(idParamSchema), markAsRead);
router.post('/read-all', markAllAsRead);
router.delete('/:id', validate(idParamSchema), deleteNotification);

export default router;