import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse, errorResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
});

const updateDepartmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase().optional(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
});

const departmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['code', 'name', 'createdAt']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createDepartment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = createDepartmentSchema.parse(req.body);
  
  const existing = await prisma.department.findUnique({ where: { code: data.code } });
  if (existing) {
    throw new ConflictError('Department with this code already exists');
  }

  const department = await prisma.department.create({ data });
  res.status(201).json(successResponse(department));
});

export const getDepartments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = departmentQuerySchema.parse(req.query);
  const { page, limit, search, sortBy, sortOrder } = query;

  const where = search ? {
    OR: [
      { code: { contains: search, mode: 'insensitive' as const } },
      { name: { contains: search, mode: 'insensitive' as const } },
    ],
  } : {};

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { students: true, faculty: true, subjects: true, rooms: true },
        },
      },
    }),
    prisma.department.count({ where }),
  ]);

  res.json(paginatedResponse(departments, page, limit, total));
});

export const getDepartment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      _count: {
        select: { students: true, faculty: true, subjects: true, rooms: true },
      },
    },
  });

  if (!department) {
    throw new NotFoundError('Department', id);
  }

  res.json(successResponse(department));
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = updateDepartmentSchema.parse(req.body);

  if (data.code) {
    const existing = await prisma.department.findFirst({
      where: { code: data.code, NOT: { id } },
    });
    if (existing) {
      throw new ConflictError('Department with this code already exists');
    }
  }

  const department = await prisma.department.update({
    where: { id },
    data,
  });

  res.json(successResponse(department));
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const counts = await prisma.department.findUnique({
    where: { id },
    select: {
      _count: { select: { students: true, faculty: true, subjects: true, rooms: true } },
    },
  });

  if (!counts) {
    throw new NotFoundError('Department', id);
  }

  if (counts._count.students > 0 || counts._count.faculty > 0 || counts._count.subjects > 0 || counts._count.rooms > 0) {
    throw new ConflictError('Cannot delete department with associated records');
  }

  await prisma.department.delete({ where: { id } });
  res.json(successResponse({ message: 'Department deleted successfully' }));
});