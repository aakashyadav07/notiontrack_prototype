import { jobQueue } from '../config/queue';
import { pythonClient } from '../utils/pythonClient';
import { prisma } from '../config/database';
import { ConflictType, ConflictSeverity } from '@prisma/client';

jobQueue.registerHandler('TIMETABLE_GENERATION', async (payload: any, updateProgress: (p: number) => void) => {
  const { timetableId, ...request } = payload;
  
  try {
    updateProgress(10);
    
    const result = await pythonClient.generateTimetable(request);
    
    updateProgress(70);
    
    if (result.status === 'success' || result.status === 'partial') {
      await prisma.timetableEntry.deleteMany({ where: { timetableId } });
      await prisma.conflict.deleteMany({ where: { timetableId } });
      
      for (const entry of result.entries) {
        const startHour = parseInt(entry.startTime.split(':')[0], 10);
        let sessionType: 'MORNING' | 'AFTERNOON' | 'EVENING' = 'MORNING';
        if (startHour >= 13 && startHour < 17) sessionType = 'AFTERNOON';
        else if (startHour >= 17) sessionType = 'EVENING';
        
        await prisma.timetableEntry.create({
          data: {
            timetableId,
            examId: entry.examId,
            roomId: entry.roomId,
            date: new Date(entry.date),
            startTime: new Date(`${entry.date}T${entry.startTime}`),
            endTime: new Date(`${entry.date}T${entry.endTime}`),
            sessionType,
          },
        });
      }
      
      if (result.conflicts && result.conflicts.length > 0) {
        for (const conflict of result.conflicts) {
          await prisma.conflict.create({
            data: {
              timetableId,
              type: conflict.type as ConflictType,
              severity: conflict.severity as ConflictSeverity,
              description: conflict.description,
              entityType: conflict.entityType,
              entityId: conflict.entityId,
              relatedEntityType: conflict.relatedEntityType,
              relatedEntityId: conflict.relatedEntityId,
            },
          });
        }
      }
      
      await prisma.timetable.update({
        where: { id: timetableId },
        data: { status: result.status === 'success' ? 'GENERATED' : 'GENERATED', generatedAt: new Date() },
      });
    } else {
      await prisma.timetable.update({
        where: { id: timetableId },
        data: { status: 'DRAFT' },
      });
    }
    
    updateProgress(100);
    return result;
  } catch (error) {
    await prisma.timetable.update({
      where: { id: timetableId },
      data: { status: 'DRAFT' },
    });
    throw error;
  }
});