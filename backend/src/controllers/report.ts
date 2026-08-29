import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { NotFoundError } from '../utils/errors';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const reportQuerySchema = z.object({
  timetableId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  departmentId: z.string().cuid().optional(),
  format: z.enum(['json', 'pdf', 'excel']).default('json'),
});

const dashboardQuerySchema = z.object({
  timetableId: z.string().cuid().optional(),
});

export const getDashboard = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = dashboardQuerySchema.parse(req.query);
  const { timetableId } = query;

  const where = timetableId ? { timetableId } : {};

  const [
    totalStudents,
    totalFaculty,
    totalSubjects,
    totalRooms,
    totalExams,
    scheduledExams,
    pendingExams,
    conflicts,
    resolvedConflicts,
    roomUtilization,
    seatAllocationStatus,
    upcomingExams,
    recentNotifications,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.faculty.count(),
    prisma.subject.count(),
    prisma.room.count({ where: { isActive: true } }),
    prisma.exam.count(),
    prisma.exam.count({ where: { status: { in: ['SCHEDULED', 'PUBLISHED'] } } }),
    prisma.exam.count({ where: { status: 'DRAFT' } }),
    prisma.conflict.count({ where: { ...where, isResolved: false } }),
    prisma.conflict.count({ where: { ...where, isResolved: true } }),
    (async () => {
      const entries = await prisma.timetableEntry.findMany({
        where,
        include: { room: true, exam: { include: { registrations: { where: { status: 'REGISTERED' } } } } },
      });
      if (entries.length === 0) return 0;
      let totalUsed = 0;
      let totalCapacity = 0;
      for (const e of entries) {
        totalUsed += e.exam.registrations.length;
        totalCapacity += e.room.capacity;
      }
      return totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;
    })(),
    (async () => {
      if (!timetableId) return 'N/A';
      const timetable = await prisma.timetable.findUnique({
        where: { id: timetableId },
        select: { seatAllocations: true },
      });
      return timetable && timetable.seatAllocations.length > 0 ? 'COMPLETED' : 'PENDING';
    })(),
    prisma.exam.findMany({
      where: { examSessions: { some: { date: { gte: new Date() } } } },
      take: 10,
      orderBy: { examSessions: { _count: 'asc' } },
      include: { subject: true, examSessions: { include: { room: true }, orderBy: { date: 'asc' }, take: 1 } },
    }),
    prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    }),
  ]);

  res.json(successResponse({
    totalStudents,
    totalFaculty,
    totalSubjects,
    totalRooms,
    totalExams,
    scheduledExams,
    pendingExams,
    conflicts,
    resolvedConflicts,
    roomUtilization,
    seatAllocationStatus,
    upcomingExams: upcomingExams.map((e: typeof upcomingExams[0]) => ({
      id: e.id,
      subject: e.subject?.name,
      sessions: e.examSessions,
    })),
    recentNotifications,
  }));
});

export const getTimetableReport = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = reportQuerySchema.parse(req.query);
  const { timetableId, format } = query;

  if (!timetableId) throw new NotFoundError('Timetable ID required');

  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
    include: {
      entries: {
        include: { exam: { include: { subject: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      },
      conflicts: true,
      seatAllocations: { include: { student: { include: { department: true } }, room: true } },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', timetableId);

  if (format === 'json') {
    res.json(successResponse(timetable));
    return;
  }

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    
    const ws1 = workbook.addWorksheet('Timetable');
    ws1.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Session', key: 'session', width: 15 },
      { header: 'Start', key: 'start', width: 10 },
      { header: 'End', key: 'end', width: 10 },
      { header: 'Exam', key: 'exam', width: 30 },
      { header: 'Subject', key: 'subject', width: 30 },
      { header: 'Room', key: 'room', width: 20 },
      { header: 'Capacity', key: 'capacity', width: 12 },
    ];
    
    for (const entry of timetable.entries) {
      ws1.addRow({
        date: entry.date.toISOString().split('T')[0],
        session: entry.sessionType,
        start: entry.startTime.toISOString().split('T')[1].slice(0,5),
        end: entry.endTime.toISOString().split('T')[1].slice(0,5),
        exam: entry.exam.subject.name,
        subject: entry.exam.subject.code,
        room: entry.room.code,
        capacity: entry.room.capacity,
      });
    }

    const ws2 = workbook.addWorksheet('Conflicts');
    ws2.columns = [
      { header: 'Type', key: 'type', width: 30 },
      { header: 'Severity', key: 'severity', width: 15 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Entity', key: 'entity', width: 30 },
      { header: 'Resolved', key: 'resolved', width: 12 },
    ];
    
    for (const c of timetable.conflicts) {
      ws2.addRow({
        type: c.type,
        severity: c.severity,
        description: c.description,
        entity: `${c.entityType}:${c.entityId}`,
        resolved: c.isResolved ? 'Yes' : 'No',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="timetable-report-${timetable.name}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } else {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="timetable-report-${timetable.name}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text(`Timetable Report - ${timetable.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Period: ${timetable.startDate.toISOString().split('T')[0]} to ${timetable.endDate.toISOString().split('T')[0]}`);
    doc.text(`Status: ${timetable.status}`);
    doc.text(`Exams Scheduled: ${timetable.entries.length}`);
    doc.text(`Conflicts: ${timetable.conflicts.length} (${timetable.conflicts.filter((c: typeof timetable.conflicts[0]) => !c.isResolved).length} unresolved)`);
    doc.moveDown();

    const headers = ['Date', 'Session', 'Time', 'Exam', 'Subject', 'Room', 'Capacity'];
    const colWidths = [70, 60, 70, 180, 100, 80, 60];
    let y = doc.y;

    doc.font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, 30 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] }));
    doc.moveDown(0.3);
    doc.font('Helvetica');

    for (const entry of timetable.entries) {
      y = doc.y;
      const row = [
        entry.date.toISOString().split('T')[0],
        entry.sessionType,
        `${entry.startTime.toISOString().split('T')[1].slice(0,5)}-${entry.endTime.toISOString().split('T')[1].slice(0,5)}`,
        entry.exam.subject.name,
        entry.exam.subject.code,
        entry.room.code,
        entry.room.capacity.toString(),
      ];
      row.forEach((cell, i) => doc.text(cell, 30 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i] }));
      doc.moveDown(0.2);
    }

    doc.end();
  }
});

export const getRoomUtilizationReport = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = reportQuerySchema.parse(req.query);
  const { timetableId, format } = query;

  const where = timetableId ? { timetableId } : {};

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: { room: true, exam: { include: { registrations: { where: { status: 'REGISTERED' } } } } },
  });

  const roomStats = new Map();
  for (const entry of entries) {
    if (!roomStats.has(entry.roomId)) {
      roomStats.set(entry.roomId, { room: entry.room, totalStudents: 0, totalCapacity: 0, examCount: 0 });
    }
    const stat = roomStats.get(entry.roomId);
    stat.totalStudents += entry.exam.registrations.length;
    stat.totalCapacity += entry.room.capacity;
    stat.examCount++;
  }

  const report = Array.from(roomStats.values()).map(s => ({
    room: s.room.code,
    roomName: s.room.name,
    capacity: s.room.capacity,
    examsScheduled: s.examCount,
    totalStudents: s.totalStudents,
    totalCapacity: s.totalCapacity,
    utilization: s.totalCapacity > 0 ? Math.round((s.totalStudents / s.totalCapacity) * 100) : 0,
  }));

  if (format === 'json') {
    res.json(successResponse(report));
    return;
  }

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Room Utilization');
    ws.columns = [
      { header: 'Room', key: 'room', width: 15 },
      { header: 'Room Name', key: 'roomName', width: 25 },
      { header: 'Capacity', key: 'capacity', width: 12 },
      { header: 'Exams', key: 'examCount', width: 10 },
      { header: 'Total Students', key: 'totalStudents', width: 15 },
      { header: 'Total Capacity', key: 'totalCapacity', width: 15 },
      { header: 'Utilization %', key: 'utilization', width: 15 },
    ];
    for (const r of report) ws.addRow(r);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="room-utilization.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } else {
    res.json(successResponse(report));
  }
});

export const getSeatAllocationReport = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = reportQuerySchema.parse(req.query);
  const { timetableId, format } = query;

  if (!timetableId) throw new NotFoundError('Timetable ID required');

  const timetable = await prisma.timetable.findUnique({
    where: { id: timetableId },
    include: {
      seatAllocations: {
        include: {
          student: { include: { user: { select: { email: true } }, department: true } },
          exam: { include: { subject: true } },
          room: true,
        },
        orderBy: [{ room: { code: 'asc' } }, { seatRow: 'asc' }, { seatColumn: 'asc' }],
      },
    },
  });

  if (!timetable) throw new NotFoundError('Timetable', timetableId);

  if (format === 'json') {
    res.json(successResponse(timetable.seatAllocations));
    return;
  }

  res.json(successResponse(timetable.seatAllocations));
});

export const getConflictReport = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = reportQuerySchema.parse(req.query);
  const { timetableId, format } = query;

  const where = timetableId ? { timetableId } : {};

  const conflicts = await prisma.conflict.findMany({
    where,
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    include: { timetable: { select: { name: true } } },
  });

  const stats = {
    total: conflicts.length,
    resolved: conflicts.filter((c: typeof conflicts[0]) => c.isResolved).length,
    unresolved: conflicts.filter((c: typeof conflicts[0]) => !c.isResolved).length,
    byType: conflicts.reduce((acc: Record<string, number>, c: typeof conflicts[0]) => ({ ...acc, [c.type as string]: (acc[c.type as string] || 0) + 1 }), {} as Record<string, number>),
    bySeverity: conflicts.reduce((acc: Record<string, number>, c: typeof conflicts[0]) => ({ ...acc, [c.severity as string]: (acc[c.severity as string] || 0) + 1 }), {} as Record<string, number>),
  };

  if (format === 'json') {
    res.json(successResponse({ stats, conflicts }));
    return
  }

  res.json(successResponse({ stats, conflicts }));
});

export const getFacultyWorkloadReport = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = reportQuerySchema.parse(req.query);
  const { startDate, endDate, format } = query;

  const where: any = {};
  if (startDate && endDate) {
    where.date = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const assignments = await prisma.invigilatorAssignment.findMany({
    where,
    include: { faculty: { include: { user: { select: { email: true } }, department: true } }, room: true },
  });

  const workload = new Map();
  for (const a of assignments) {
    if (!workload.has(a.facultyId)) {
      workload.set(a.facultyId, { faculty: a.faculty, count: 0, exams: [] });
    }
    const w = workload.get(a.facultyId);
    w.count++;
    w.exams.push({ examId: a.examId, date: a.date, room: a.room?.code });
  }

  const report = Array.from(workload.values()).map(w => ({
    facultyId: w.faculty.employeeId,
    name: w.faculty.user.email.split('@')[0],
    department: w.faculty.department.code,
    designation: w.faculty.designation,
    assignedCount: w.count,
    maxWorkload: w.faculty.maxWorkload,
    utilization: Math.round((w.count / w.faculty.maxWorkload) * 100),
    exams: w.exams,
  }));

  if (format === 'json') {
    res.json(successResponse(report));
    return;
  }

  res.json(successResponse(report));
});

export const getExamStatistics = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const query = reportQuerySchema.parse(req.query);
  const { timetableId, format } = query;

  const where = timetableId ? { timetableId } : {};

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: { exam: { include: { subject: true, registrations: { where: { status: 'REGISTERED' } } } }, room: true },
  });

  const bySubject = entries.reduce((acc: Record<string, { exams: number; students: number }>, e: typeof entries[0]) => {
    const subj = e.exam.subject.name;
    if (!acc[subj]) acc[subj] = { exams: 0, students: 0 };
    acc[subj].exams++;
    acc[subj].students += e.exam.registrations.length;
    return acc;
  }, {} as Record<string, { exams: number; students: number }>);

  const byExamType = entries.reduce((acc: Record<string, { exams: number; students: number }>, e: typeof entries[0]) => {
    const type = e.exam.examType;
    if (!acc[type]) acc[type] = { exams: 0, students: 0 };
    acc[type].exams++;
    acc[type].students += e.exam.registrations.length;
    return acc;
  }, {} as Record<string, { exams: number; students: number }>);

  const stats = {
    totalExams: entries.length,
    totalStudents: entries.reduce((sum: number, e: typeof entries[0]) => sum + e.exam.registrations.length, 0),
    bySubject,
    byExamType,
    avgStudentsPerExam: entries.length > 0 ? Math.round(entries.reduce((sum: number, e: typeof entries[0]) => sum + e.exam.registrations.length, 0) / entries.length) : 0,
  };

  res.json(successResponse(stats));
});