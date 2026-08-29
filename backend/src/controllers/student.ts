import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse, errorResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createStudentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  studentId: z.string().min(3).max(20).toUpperCase(),
  departmentId: z.string().cuid(),
  semester: z.number().int().min(1).max(10),
  section: z.string().max(5).optional(),
});

const updateStudentSchema = z.object({
  studentId: z.string().min(3).max(20).toUpperCase().optional(),
  departmentId: z.string().cuid().optional(),
  semester: z.number().int().min(1).max(10).optional(),
  section: z.string().max(5).optional(),
  isActive: z.boolean().optional(),
});

const studentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().cuid().optional(),
  semester: z.coerce.number().int().min(1).max(10).optional(),
  section: z.string().optional(),
  sortBy: z.enum(['studentId', 'createdAt', 'semester']).default('studentId'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const createStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = createStudentSchema.parse(req.body);

  const [existingEmail, existingStudentId] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.student.findUnique({ where: { studentId: data.studentId } }),
  ]);

  if (existingEmail) throw new ConflictError('Email already registered');
  if (existingStudentId) throw new ConflictError('Student ID already exists');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, role: 'STUDENT' },
  });

  const student = await prisma.student.create({
    data: {
      userId: user.id,
      studentId: data.studentId,
      departmentId: data.departmentId,
      semester: data.semester,
      section: data.section,
    },
    include: { department: true, user: { select: { id: true, email: true, role: true } } },
  });

  res.status(201).json(successResponse(student));
});

export const getStudents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = studentQuerySchema.parse(req.query);
  const { page, limit, search, departmentId, semester, section, sortBy, sortOrder } = query;

  const where: any = {};
  if (search) {
    where.OR = [
      { studentId: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (semester) where.semester = semester;
  if (section) where.section = section;

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { department: true, user: { select: { id: true, email: true, role: true, isActive: true } } },
    }),
    prisma.student.count({ where }),
  ]);

  res.json(paginatedResponse(students, page, limit, total));
});

export const getStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      department: true,
      user: { select: { id: true, email: true, role: true, isActive: true } },
      enrollments: { include: { subject: true } },
      examRegistrations: { include: { exam: { include: { subject: true } } } },
    },
  });

  if (!student) throw new NotFoundError('Student', id);

  res.json(successResponse(student));
});

export const updateStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = updateStudentSchema.parse(req.body);

  if (data.studentId) {
    const existing = await prisma.student.findFirst({
      where: { studentId: data.studentId, NOT: { id } },
    });
    if (existing) throw new ConflictError('Student ID already exists');
  }

  const student = await prisma.student.update({
    where: { id },
    data,
    include: { department: true, user: { select: { id: true, email: true, role: true, isActive: true } } },
  });

  res.json(successResponse(student));
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id }, include: { user: true } });
    if (!student) throw new NotFoundError('Student', id);

    await tx.examRegistration.deleteMany({ where: { studentId: id } });
    await tx.enrollment.deleteMany({ where: { studentId: id } });
    await tx.seatAllocation.deleteMany({ where: { studentId: id } });
    await tx.student.delete({ where: { id } });
    await tx.user.delete({ where: { id: student.userId } });
  });

  res.json(successResponse({ message: 'Student deleted successfully' }));
});

export const getStudentTimetable = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      examRegistrations: {
        where: { status: 'REGISTERED' },
        include: {
          exam: {
            include: {
              subject: true,
              timetableEntries: {
                include: { room: true },
                orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
              },
            },
          },
        },
      },
    },
  });

  if (!student) throw new NotFoundError('Student', id);

  const timetable = student.examRegistrations
    .filter((reg: typeof student.examRegistrations[0]) => reg.exam.timetableEntries.length > 0)
    .map((reg: typeof student.examRegistrations[0]) => ({
      exam: { id: reg.exam.id, subject: { name: reg.exam.subject?.name, code: reg.exam.subject?.code } },
      entries: reg.exam.timetableEntries,
    }));

  res.json(successResponse(timetable));
});

export const getStudentSeatAllocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const allocations = await prisma.seatAllocation.findMany({
    where: { studentId: id },
    include: {
      exam: { include: { subject: true } },
      room: true,
      timetable: true,
    },
    orderBy: [{ seatRow: 'asc' }, { seatColumn: 'asc' }],
  });

  res.json(successResponse(allocations));
});