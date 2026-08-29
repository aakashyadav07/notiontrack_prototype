import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createFacultySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  employeeId: z.string().min(3).max(20).toUpperCase(),
  departmentId: z.string().cuid(),
  designation: z.string().min(2).max(50),
  maxWorkload: z.number().int().positive().max(10).default(4),
});

const updateFacultySchema = z.object({
  employeeId: z.string().min(3).max(20).toUpperCase().optional(),
  departmentId: z.string().cuid().optional(),
  designation: z.string().min(2).max(50).optional(),
  maxWorkload: z.number().int().positive().max(10).optional(),
  isActive: z.boolean().optional(),
});

const facultyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().cuid().optional(),
  designation: z.string().optional(),
  sortBy: z.enum(['employeeId', 'designation', 'createdAt']).default('employeeId'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createFaculty = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = createFacultySchema.parse(req.body);

  const [existingEmail, existingEmployeeId] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.faculty.findUnique({ where: { employeeId: data.employeeId } }),
  ]);

  if (existingEmail) throw new ConflictError('Email already registered');
  if (existingEmployeeId) throw new ConflictError('Employee ID already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, role: 'FACULTY' },
  });

  const faculty = await prisma.faculty.create({
    data: {
      userId: user.id,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      designation: data.designation,
      maxWorkload: data.maxWorkload,
    },
    include: { department: true, user: { select: { id: true, email: true, role: true } } },
  });

  res.status(201).json(successResponse(faculty));
});

export const getFaculty = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = facultyQuerySchema.parse(req.query);
  const { page, limit, search, departmentId, designation, sortBy, sortOrder } = query;

  const where: any = {};
  if (search) {
    where.OR = [
      { employeeId: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (designation) where.designation = { contains: designation, mode: 'insensitive' };

  const [faculty, total] = await Promise.all([
    prisma.faculty.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { department: true, user: { select: { id: true, email: true, role: true, isActive: true } } },
    }),
    prisma.faculty.count({ where }),
  ]);

  res.json(paginatedResponse(faculty, page, limit, total));
});

export const getFacultyMember = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const faculty = await prisma.faculty.findUnique({
    where: { id },
    include: {
      department: true,
      user: { select: { id: true, email: true, role: true, isActive: true } },
      invigilatorAssignments: {
        include: { exam: { include: { subject: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!faculty) throw new NotFoundError('Faculty', id);

  res.json(successResponse(faculty));
});

export const updateFaculty = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = updateFacultySchema.parse(req.body);

  if (data.employeeId) {
    const existing = await prisma.faculty.findFirst({
      where: { employeeId: data.employeeId, NOT: { id } },
    });
    if (existing) throw new ConflictError('Employee ID already exists');
  }

  const faculty = await prisma.faculty.update({
    where: { id },
    data,
    include: { department: true, user: { select: { id: true, email: true, role: true, isActive: true } } },
  });

  res.json(successResponse(faculty));
});

export const deleteFaculty = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  await prisma.$transaction(async (tx) => {
    const faculty = await tx.faculty.findUnique({ where: { id }, include: { user: true } });
    if (!faculty) throw new NotFoundError('Faculty', id);

    await tx.invigilatorAssignment.deleteMany({ where: { facultyId: id } });
    await tx.faculty.delete({ where: { id } });
    await tx.user.delete({ where: { id: faculty.userId } });
  });

  res.json(successResponse({ message: 'Faculty deleted successfully' }));
});

export const getFacultyAssignments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { date, startDate, endDate } = req.query;

  const where: any = { facultyId: id };
  if (date) {
    where.date = new Date(date as string);
  } else if (startDate && endDate) {
    where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
  }

  const assignments = await prisma.invigilatorAssignment.findMany({
    where,
    include: { exam: { include: { subject: true } }, room: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  res.json(successResponse(assignments));
});