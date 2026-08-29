import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  getRoomLayout,
  updateRoomLayout,
} from '../controllers/room';

const router = Router();

const idParamSchema = z.object({ params: z.object({ id: z.string().cuid() }) });

const createRoomSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(20).toUpperCase(),
    name: z.string().min(2).max(100),
    capacity: z.number().int().positive().max(1000),
    departmentId: z.string().cuid().optional(),
    floor: z.number().int().optional(),
    building: z.string().max(50).optional(),
    hasProjector: z.boolean().default(false),
    hasAC: z.boolean().default(false),
    isAccessible: z.boolean().default(false),
  }),
});

const updateRoomSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(20).toUpperCase().optional(),
    name: z.string().min(2).max(100).optional(),
    capacity: z.number().int().positive().max(1000).optional(),
    departmentId: z.string().cuid().optional(),
    floor: z.number().int().optional(),
    building: z.string().max(50).optional(),
    hasProjector: z.boolean().optional(),
    hasAC: z.boolean().optional(),
    isAccessible: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

const roomQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional(),
    departmentId: z.string().cuid().optional(),
    minCapacity: z.coerce.number().int().positive().optional(),
    maxCapacity: z.coerce.number().int().positive().optional(),
    isActive: z.coerce.boolean().optional(),
    sortBy: z.enum(['code', 'capacity', 'createdAt']).default('code'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
});

const seatLayoutSchema = z.object({
  body: z.object({
    rows: z.number().int().positive().max(50),
    columns: z.number().int().positive().max(50),
    layout: z.record(z.unknown()).optional(),
  }),
  params: z.object({ id: z.string().cuid() }),
});

router.use(requireAuth);

router.post('/', requireAdmin, validate(createRoomSchema), createRoom);
router.get('/', validate(roomQuerySchema), getRooms);
router.get('/:id', validate(idParamSchema), getRoom);
router.put('/:id', requireAdmin, validate(updateRoomSchema), updateRoom);
router.delete('/:id', requireAdmin, validate(idParamSchema), deleteRoom);
router.get('/:id/layout', validate(idParamSchema), getRoomLayout);
router.put('/:id/layout', requireAdmin, validate(seatLayoutSchema), updateRoomLayout);

export default router;