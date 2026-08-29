import { jobQueue } from '../config/queue';
import { pythonClient } from '../utils/pythonClient';
import { prisma } from '../config/database';

jobQueue.registerHandler('SEAT_ALLOCATION', async (payload: any, updateProgress: (p: number) => void) => {
  const { timetableId, antiCheatingRules } = payload;
  
  try {
    updateProgress(10);
    
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      include: {
        entries: {
          include: { 
            exam: { include: { subject: true, registrations: { where: { status: 'REGISTERED' }, include: { student: true } } } }, 
            room: { include: { seatLayout: true } } 
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    
    if (!timetable) throw new Error('Timetable not found');
    
    updateProgress(30);
    
    const rooms = timetable.entries.map((e: typeof timetable.entries[0]) => ({
      id: e.room.id,
      capacity: e.room.capacity,
      rows: e.room.seatLayout?.rows || Math.ceil(Math.sqrt(e.room.capacity / 2)),
      columns: e.room.seatLayout?.columns || Math.ceil(e.room.capacity / Math.ceil(Math.sqrt(e.room.capacity / 2))),
      layout: (e.room.seatLayout?.layout as Record<string, unknown>) ?? undefined,
    }));
    
    const uniqueRooms = rooms.filter((r: typeof rooms[0], i: number, arr: typeof rooms) => arr.findIndex((x: typeof rooms[0]) => x.id === r.id) === i);
    
    const studentsByExam: Record<string, any[]> = {};
    for (const entry of timetable.entries) {
      const examId = entry.examId;
      if (!studentsByExam[examId]) {
        studentsByExam[examId] = entry.exam.registrations.map((reg: typeof entry.exam.registrations[0]) => ({
          id: reg.student.id,
          departmentId: reg.student.departmentId,
          section: reg.student.section,
        }));
      }
    }
    
    const request = {
      timetableEntries: timetable.entries.map((e: typeof timetable.entries[0]) => ({
        examId: e.examId,
        roomId: e.roomId,
        date: e.date.toISOString().split('T')[0],
        startTime: e.startTime.toISOString().split('T')[1].slice(0,5),
        endTime: e.endTime.toISOString().split('T')[1].slice(0,5),
      })),
      rooms: uniqueRooms,
      studentsByExam,
      antiCheatingRules,
    };
    
    updateProgress(50);
    
    const result = await pythonClient.generateSeatAllocation(request);
    
    updateProgress(80);
    
    await prisma.seatAllocation.deleteMany({ where: { timetableId } });
    
    for (const alloc of result.allocations) {
      await prisma.seatAllocation.create({
        data: {
          timetableId,
          studentId: alloc.studentId,
          examId: alloc.examId,
          roomId: alloc.roomId,
          seatRow: alloc.seatRow,
          seatColumn: alloc.seatColumn,
          seatNumber: alloc.seatNumber,
        },
      });
    }
    
    await prisma.timetable.update({
      where: { id: timetableId },
      data: { status: 'GENERATED' },
    });
    
    updateProgress(100);
    return result;
  } catch (error) {
    throw error;
  }
});