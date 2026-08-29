import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';

const createExamSchema = z.object({
  subjectId: z.string().cuid(),
  examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).default('REGULAR'),
  duration: z.number().int().positive().max(300),
  maxStudents: z.number().int().positive().optional(),
});

const updateExamSchema = z.object({
  subjectId: z.string().cuid().optional(),
  examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).optional(),
  duration: z.number().int().positive().max(300).optional(),
  maxStudents: z.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
});

const examQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  subjectId: z.string().cuid().optional(),
  examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'COMPLETED', 'CANCELLED']).optional(),
  sortBy: z.enum(['createdAt', 'examType', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const registrationSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1),
});

export const createExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = createExamSchema.parse(req.body);

  const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
  if (!subject) throw new NotFoundError('Subject', data.subjectId);

  const exam = await prisma.exam.create({
    data: {
      ...data,
      maxStudents: data.maxStudents ?? 100,
    },
    include: { subject: { include: { department: true } } },
  });

  res.status(201).json(successResponse(exam));
});

export const getExams = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = examQuerySchema.parse(req.query);
  const { page, limit, search, subjectId, examType, status, sortBy, sortOrder } = query;

  const where: any = {};
  if (search) {
    where.OR = [
      { subject: { code: { contains: search, mode: 'insensitive' } } },
      { subject: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (subjectId) where.subjectId = subjectId;
  if (examType) where.examType = examType;
  if (status) where.status = status;

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { subject: { include: { department: true } }, _count: { select: { registrations: true } } },
    }),
    prisma.exam.count({ where }),
  ]);

  res.json(paginatedResponse(exams, page, limit, total));
});

export const getExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      subject: { include: { department: true } },
      examSessions: { include: { room: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
      registrations: { include: { student: { include: { user: { select: { email: true } } } } } },
      timetableEntries: { include: { room: true, timetable: true }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
      invigilatorAssignments: { include: { faculty: { include: { user: { select: { email: true } } } }, room: true } },
    },
  });

  if (!exam) throw new NotFoundError('Exam', id);

  res.json(successResponse(exam));
});

export const updateExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = updateExamSchema.parse(req.body);

  if (data.subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject) throw new NotFoundError('Subject', data.subjectId);
  }

  const exam = await prisma.exam.update({
    where: { id },
    data,
    include: { subject: { include: { department: true } } },
  });

  res.json(successResponse(exam));
});

export const deleteExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const counts = await prisma.exam.findUnique({
    where: { id },
    select: {
      _count: { select: { examSessions: true, registrations: true, timetableEntries: true, invigilatorAssignments: true } },
    },
  });

  if (!counts) throw new NotFoundError('Exam', id);

  if (counts._count.examSessions > 0 || counts._count.registrations > 0 || counts._count.timetableEntries > 0 || counts._count.invigilatorAssignments > 0) {
    throw new ConflictError('Cannot delete exam with associated records');
  }

  await prisma.exam.delete({ where: { id } });
  res.json(successResponse({ message: 'Exam deleted successfully' }));
});

export const registerStudents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = registrationSchema.parse(req.body);

  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw new NotFoundError('Exam', id);

  const results = await Promise.all(
    data.studentIds.map(async (studentId) => {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) return { studentId, success: false, error: 'Student not found' };

      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_subjectId: { studentId, subjectId: exam.subjectId } },
      });
      if (!enrollment) return { studentId, success: false, error: 'Student not enrolled in subject' };

      const existing = await prisma.examRegistration.findUnique({
        where: { studentId_examId: { studentId, examId: id } },
      });
      if (existing) return { studentId, success: false, error: 'Already registered' };

      if (exam.maxStudents) {
        const count = await prisma.examRegistration.count({ where: { examId: id, status: 'REGISTERED' } });
        if (count >= exam.maxStudents) return { studentId, success: false, error: 'Exam at capacity' };
      }

      await prisma.examRegistration.create({
        data: { studentId, examId: id, status: 'REGISTERED' },
      });

      return { studentId, success: true };
    })
  );

  res.json(successResponse(results));
});

export const unregisterStudents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const data = registrationSchema.parse(req.body);

  await prisma.examRegistration.deleteMany({
    where: { examId: id, studentId: { in: data.studentIds } },
  });

  res.json(successResponse({ message: 'Students unregistered successfully' }));
});