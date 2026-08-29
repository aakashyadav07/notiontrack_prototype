import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, paginatedResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError, ConflictError } from '../utils/errors';
import { z } from 'zod';
import { pythonClient } from '../utils/pythonClient';
import { jobQueue, JobType } from '../config/queue';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const generateSeatAllocationSchema = z.object({
  timetableId: z.string().cuid(),
  antiCheatingRules: z.object({
    separateSameSubject: z.boolean().default(true),
    separateSameSection: z.boolean().default(true),
    separateSameDepartment: z.boolean().default(false),
    minColumnGap: z.number().int().nonnegative().default(1),
  }).optional(),
});

const seatAllocationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  timetableId: z.string().cuid().optional(),
  examId: z.string().cuid().optional(),
  roomId: z.string().cuid().optional(),
  studentId: z.string().cuid().optional(),
  sortBy: z.enum(['seatNumber', 'studentId', 'createdAt']).default('seatNumber'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const exportSchema = z.object({
  format: z.enum(['pdf', 'excel']).default('excel'),
});

export const generateSeatAllocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  const data = generateSeatAllocationSchema.parse(req.body);

  const timetable = await prisma.timetable.findUnique({
    where: { id: data.timetableId },
    include: {
      entries: {
        include: { exam: { include: { subject: true } }, room: { include: { seatLayout: true } } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', data.timetableId);
  if (timetable.status !== 'PUBLISHED' && timetable.status !== 'GENERATED') {
    throw new ConflictError('Seat allocation can only be generated for published or generated timetables');
  }

  const jobId = jobQueue.enqueue('SEAT_ALLOCATION', {
    timetableId: data.timetableId,
    antiCheatingRules: data.antiCheatingRules,
  });

  res.status(202).json(successResponse({ jobId, status: 'processing' }));
});

export const getSeatAllocationJob = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);
  
  if (!job) throw new NotFoundError('Job', jobId);

  res.json(successResponse({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
  }));
});

export const getSeatAllocations = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = seatAllocationQuerySchema.parse(req.query);
  const { page, limit, timetableId, examId, roomId, studentId, sortBy, sortOrder } = query;

  const where: any = {};
  if (timetableId) where.timetableId = timetableId;
  if (examId) where.examId = examId;
  if (roomId) where.roomId = roomId;
  if (studentId) where.studentId = studentId;

  const [allocations, total] = await Promise.all([
    prisma.seatAllocation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        student: { include: { user: { select: { email: true } }, department: true } },
        exam: { include: { subject: true } },
        room: true,
      },
    }),
    prisma.seatAllocation.count({ where }),
  ]);

  res.json(paginatedResponse(allocations, page, limit, total));
});

export const getSeatAllocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  const allocation = await prisma.seatAllocation.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { email: true } }, department: true } },
      exam: { include: { subject: true } },
      room: { include: { seatLayout: true } },
      timetable: true,
    },
  });

  if (!allocation) throw new NotFoundError('Seat allocation', id);

  res.json(successResponse(allocation));
});

export const exportSeatAllocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const query = exportSchema.parse(req.query);

  const timetable = await prisma.timetable.findUnique({
    where: { id },
    include: {
      seatAllocations: {
        include: {
          student: { include: { user: { select: { email: true } }, department: true } },
          exam: { include: { subject: true } },
          room: { include: { seatLayout: true } },
        },
        orderBy: [{ room: { code: 'asc' } }, { seatRow: 'asc' }, { seatColumn: 'asc' }],
      },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', id);
  if (timetable.seatAllocations.length === 0) throw new ConflictError('No seat allocations found for this timetable');

  if (query.format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Seat Allocation');

    worksheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 20 },
      { header: 'Student Name', key: 'studentName', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Exam', key: 'exam', width: 30 },
      { header: 'Subject', key: 'subject', width: 30 },
      { header: 'Room', key: 'room', width: 20 },
      { header: 'Seat Number', key: 'seatNumber', width: 15 },
      { header: 'Row', key: 'seatRow', width: 10 },
      { header: 'Column', key: 'seatColumn', width: 10 },
    ];

    for (const alloc of timetable.seatAllocations) {
      worksheet.addRow({
        studentId: alloc.student.studentId,
        studentName: alloc.student.user.email.split('@')[0],
        email: alloc.student.user.email,
        department: alloc.student.department.code,
        section: alloc.student.section || '',
        exam: alloc.exam.subject.name,
        subject: alloc.exam.subject.code,
        room: alloc.room.code,
        seatNumber: alloc.seatNumber,
        seatRow: alloc.seatRow,
        seatColumn: alloc.seatColumn,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="seat-allocation-${timetable.name}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } else {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="seat-allocation-${timetable.name}.pdf"`);
    
    doc.pipe(res);

    doc.fontSize(18).text(`Seat Allocation - ${timetable.name}`, { align: 'center' });
    doc.moveDown();

    const rooms = new Map();
    for (const alloc of timetable.seatAllocations) {
      if (!rooms.has(alloc.roomId)) rooms.set(alloc.roomId, []);
      rooms.get(alloc.roomId)!.push(alloc);
    }

    for (const [roomId, allocations] of rooms) {
      const room = allocations[0].room;
      doc.fontSize(14).text(`Room: ${room.code} (${room.name}) - Capacity: ${room.capacity}`);
      doc.moveDown(0.5);

      const headers = ['Seat', 'Student ID', 'Student', 'Department', 'Exam'];
      const colWidths = [60, 100, 150, 100, 200];
      let y = doc.y;

      doc.font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, 30 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
      });
      doc.moveDown(0.3);
      doc.font('Helvetica');

      for (const alloc of allocations) {
        y = doc.y;
        const row = [
          alloc.seatNumber,
          alloc.student.studentId,
          alloc.student.user.email.split('@')[0],
          alloc.student.department.code,
          alloc.exam.subject.name,
        ];
        row.forEach((cell, i) => {
          doc.text(cell, 30 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] });
        });
        doc.moveDown(0.2);
      }
      doc.moveDown(1);
    }

    doc.end();
  }
});

export const regenerateSeatAllocation = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const authReq = req as any;

  const timetable = await prisma.timetable.findUnique({ where: { id } });
  if (!timetable) throw new NotFoundError('Timetable', id);

  await prisma.seatAllocation.deleteMany({ where: { timetableId: id } });

  const jobId = jobQueue.enqueue('SEAT_ALLOCATION', {
    timetableId: id,
    antiCheatingRules: {
      separateSameSubject: true,
      separateSameSection: true,
      separateSameDepartment: false,
      minColumnGap: 1,
    },
  });

  res.status(202).json(successResponse({ jobId, status: 'processing' }));
});