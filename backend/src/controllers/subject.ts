import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';

const createSubjectSchema = z.object({
  code: z.string().min(3).max(15).toUpperCase(),
  name: z.string().min(2).max(100),
  departmentId: z.string().cuid(),
  credits: z.number().int().positive().max(6).default(3),
  examDuration: z.number().int().positive().max(300).default(180),
});

const updateSubjectSchema = z.object({
  code: z.string().min(3).max(15).toUpperCase().optional(),
  name: z.string().min(2).max(100).optional(),
  departmentId: z.string().cuid().optional(),
  credits: z.number().int().positive().max(6).optional(),
  examDuration: z.number().int().positive().max(300).optional(),
});

const subjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().cuid().optional(),
  sortBy: z.enum(['code', 'name', 'createdAt']).default('code'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createSubject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = createSubjectSchema.parse(req.body);

  const existing = await prisma.subject.findUnique({ where: { code: data.code } });
  if (existing) throw new ConflictError('Subject with this code already exists');

  const subject = await prisma.subject.create({
    data,
    include: { department: true },
  });

  res.status(201).json(successResponse(subject));
});

export const getSubjects = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = subjectQuerySchema.parse(req.query);
  const { page, limit, search, departmentId, sortBy, sortOrder } = query;

  const where: any = {};
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { department: true, _count: { select: { exams: true, enrollments: true } } },
    }),
    prisma.subject.count({ where }),
  ]);

  res.json(paginatedResponse(subjects, page, limit, total));
});

export const getSubject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      department: true,
      exams: true,
      enrollments: { include: { student: { include: { user: { select: { email: true } } } } } },
    },
  });

  if (!subject) throw new NotFoundError('Subject', id);

  res.json(successResponse(subject));
});

export const updateSubject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = updateSubjectSchema.parse(req.body);

  if (data.code) {
    const existing = await prisma.subject.findFirst({
      where: { code: data.code, NOT: { id } },
    });
    if (existing) throw new ConflictError('Subject with this code already exists');
  }

  const subject = await prisma.subject.update({
    where: { id },
    data,
    include: { department: true },
  });

  res.json(successResponse(subject));
});

export const deleteSubject = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const counts = await prisma.subject.findUnique({
    where: { id },
    select: { _count: { select: { exams: true, enrollments: true } } },
  });

  if (!counts) throw new NotFoundError('Subject', id);

  if (counts._count.exams > 0 || counts._count.enrollments > 0) {
    throw new ConflictError('Cannot delete subject with associated exams or enrollments');
  }

  await prisma.subject.delete({ where: { id } });
  res.json(successResponse({ message: 'Subject deleted successfully' }));
});