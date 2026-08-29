import { Router } from 'express';
import authRoutes from './auth';
import departmentRoutes from './department';
import studentRoutes from './student';
import facultyRoutes from './faculty';
import subjectRoutes from './subject';
import roomRoutes from './room';
import examRoutes from './exam';
import timetableRoutes from './timetable';
import seatAllocationRoutes from './seatAllocation';
import invigilatorRoutes from './invigilator';
import conflictRoutes from './conflict';
import reportRoutes from './report';
import notificationRoutes from './notification';
import notionRoutes from './notion';

const router = Router();

router.use('/auth', authRoutes);
router.use('/departments', departmentRoutes);
router.use('/students', studentRoutes);
router.use('/faculty', facultyRoutes);
router.use('/subjects', subjectRoutes);
router.use('/rooms', roomRoutes);
router.use('/exams', examRoutes);
router.use('/timetable', timetableRoutes);
router.use('/seat-allocation', seatAllocationRoutes);
router.use('/invigilators', invigilatorRoutes);
router.use('/conflicts', conflictRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notion', notionRoutes);

export default router;