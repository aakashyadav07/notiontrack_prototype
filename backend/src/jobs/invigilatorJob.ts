import { jobQueue } from '../config/queue';
import { pythonClient } from '../utils/pythonClient';
import { prisma } from '../config/database';

jobQueue.registerHandler('INVIGILATOR_ASSIGNMENT', async (payload: any, updateProgress: (p: number) => void) => {
  const { timetableId, invigilatorRatio, includeRelievers, relieverPercentage } = payload;
  
  try {
    updateProgress(10);
    
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      include: {
        entries: {
          include: { 
            exam: { include: { registrations: { where: { status: 'REGISTERED' } } } }, 
            room: true 
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
    
    if (!timetable) throw new Error('Timetable not found');
    
    updateProgress(30);
    
    const faculty = await prisma.faculty.findMany({
      where: { user: { isActive: true } },
    });
    
    const examSessions = timetable.entries.map((e: typeof timetable.entries[0]) => ({
      examId: e.examId,
      roomId: e.roomId,
      date: e.date.toISOString().split('T')[0],
      startTime: e.startTime.toISOString().split('T')[1].slice(0,5),
      endTime: e.endTime.toISOString().split('T')[1].slice(0,5),
      studentCount: e.exam.registrations.length,
    }));
    
    const request = {
      examSessions,
      faculty: faculty.map((f: typeof faculty[0]) => ({ id: f.id, maxWorkload: f.maxWorkload })),
      invigilatorRatio,
      includeRelievers,
      relieverPercentage,
    };
    
    updateProgress(50);
    
    const result = await pythonClient.generateInvigilatorAssignments(request);
    
    updateProgress(80);
    
    for (const assignment of result.assignments) {
      await prisma.invigilatorAssignment.upsert({
        where: { 
          id: `${assignment.examId}-${assignment.facultyId}-${assignment.date}-${assignment.startTime}-${assignment.role}` 
        },
        update: { roomId: assignment.roomId, endTime: new Date(`${assignment.date}T${assignment.endTime}`) },
        create: {
          examId: assignment.examId,
          facultyId: assignment.facultyId,
          roomId: assignment.roomId,
          date: new Date(assignment.date),
          startTime: new Date(`${assignment.date}T${assignment.startTime}`),
          endTime: new Date(`${assignment.date}T${assignment.endTime}`),
          role: assignment.role as any,
        },
      });
    }
    
    updateProgress(100);
    return result;
  } catch (error) {
    throw error;
  }
});