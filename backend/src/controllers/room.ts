import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';

function toPrismaJson(value: Record<string, unknown> | undefined | null): unknown {
  if (value === undefined || value === null) return null;
  return value;
}

export const createRoom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = req.body;

  const existing = await prisma.room.findUnique({ where: { code: data.code } });
  if (existing) throw new ConflictError('Room with this code already exists');

  const room = await prisma.room.create({
    data,
    include: { department: true },
  });

  const rows = Math.ceil(Math.sqrt(data.capacity / 2));
  const cols = Math.ceil(data.capacity / rows);
  
  await prisma.seatLayout.create({
    data: { roomId: room.id, rows, columns: cols },
  });

  res.status(201).json(successResponse(room));
});

export const getRooms = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = req.query;

  const where: any = {};
  if (query.search) {
    where.OR = [
      { code: { contains: query.search as string, mode: 'insensitive' } },
      { name: { contains: query.search as string, mode: 'insensitive' } },
    ];
  }
  if (query.departmentId) where.departmentId = query.departmentId;
  if (query.minCapacity) where.capacity = { ...where.capacity, gte: Number(query.minCapacity) };
  if (query.maxCapacity) where.capacity = { ...where.capacity, lte: Number(query.maxCapacity) };
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const sortBy = (query.sortBy as string) || 'code';
  const sortOrder = (query.sortOrder as string) || 'asc';

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { department: true, seatLayout: true, _count: { select: { examSessions: true } } },
    }),
    prisma.room.count({ where }),
  ]);

  res.json(paginatedResponse(rooms, page, limit, total));
});

export const getRoom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: { department: true, seatLayout: true, examSessions: { include: { exam: { include: { subject: true } } } } },
  });

  if (!room) throw new NotFoundError('Room', id);

  res.json(successResponse(room));
});

export const updateRoom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = req.body;

  if (data.code) {
    const existing = await prisma.room.findFirst({
      where: { code: data.code, NOT: { id } },
    });
    if (existing) throw new ConflictError('Room with this code already exists');
  }

  const room = await prisma.room.update({
    where: { id },
    data,
    include: { department: true, seatLayout: true },
  });

  res.json(successResponse(room));
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const counts = await prisma.room.findUnique({
    where: { id },
    select: { _count: { select: { examSessions: true } } },
  });

  if (!counts) throw new NotFoundError('Room', id);

  if (counts._count.examSessions > 0) {
    throw new ConflictError('Cannot delete room with scheduled exam sessions');
  }

  await prisma.seatLayout.deleteMany({ where: { roomId: id } });
  await prisma.room.delete({ where: { id } });
  res.json(successResponse({ message: 'Room deleted successfully' }));
});

export const getRoomLayout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const layout = await prisma.seatLayout.findUnique({
    where: { roomId: id },
  });

  if (!layout) throw new NotFoundError('Room layout', id);

  res.json(successResponse(layout));
});

export const updateRoomLayout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = req.body;

  const layout = await prisma.seatLayout.upsert({
    where: { roomId: id },
    update: { rows: data.rows, columns: data.columns, layout: toPrismaJson(data.layout) as any },
    create: { roomId: id, rows: data.rows, columns: data.columns, layout: toPrismaJson(data.layout) as any },
  });

  res.json(successResponse(layout));
});