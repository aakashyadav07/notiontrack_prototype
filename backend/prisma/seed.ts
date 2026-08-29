import { PrismaClient, Role, ExamType, SessionType, ExamStatus, RegStatus, TimetableStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create Departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CSE' },
      update: {},
      create: { code: 'CSE', name: 'Computer Science & Engineering', description: 'Department of Computer Science' },
    }),
    prisma.department.upsert({
      where: { code: 'ECE' },
      update: {},
      create: { code: 'ECE', name: 'Electronics & Communication Engineering', description: 'Department of Electronics' },
    }),
    prisma.department.upsert({
      where: { code: 'MECH' },
      update: {},
      create: { code: 'MECH', name: 'Mechanical Engineering', description: 'Department of Mechanical Engineering' },
    }),
    prisma.department.upsert({
      where: { code: 'CIVIL' },
      update: {},
      create: { code: 'CIVIL', name: 'Civil Engineering', description: 'Department of Civil Engineering' },
    }),
    prisma.department.upsert({
      where: { code: 'IT' },
      update: {},
      create: { code: 'IT', name: 'Information Technology', description: 'Department of Information Technology' },
    }),
  ]);

  console.log('✅ Departments created');

  // Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: {
      email: 'admin@college.edu',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // Create Faculty Users
  const facultyUsers = await Promise.all([
    prisma.user.upsert({ where: { email: 'faculty1@college.edu' }, update: {}, create: { email: 'faculty1@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty2@college.edu' }, update: {}, create: { email: 'faculty2@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty3@college.edu' }, update: {}, create: { email: 'faculty3@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty4@college.edu' }, update: {}, create: { email: 'faculty4@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty5@college.edu' }, update: {}, create: { email: 'faculty5@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty6@college.edu' }, update: {}, create: { email: 'faculty6@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty7@college.edu' }, update: {}, create: { email: 'faculty7@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty8@college.edu' }, update: {}, create: { email: 'faculty8@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty9@college.edu' }, update: {}, create: { email: 'faculty9@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty10@college.edu' }, update: {}, create: { email: 'faculty10@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty11@college.edu' }, update: {}, create: { email: 'faculty11@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty12@college.edu' }, update: {}, create: { email: 'faculty12@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty13@college.edu' }, update: {}, create: { email: 'faculty13@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty14@college.edu' }, update: {}, create: { email: 'faculty14@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty15@college.edu' }, update: {}, create: { email: 'faculty15@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty16@college.edu' }, update: {}, create: { email: 'faculty16@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty17@college.edu' }, update: {}, create: { email: 'faculty17@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty18@college.edu' }, update: {}, create: { email: 'faculty18@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty19@college.edu' }, update: {}, create: { email: 'faculty19@college.edu', passwordHash, role: Role.FACULTY } }),
    prisma.user.upsert({ where: { email: 'faculty20@college.edu' }, update: {}, create: { email: 'faculty20@college.edu', passwordHash, role: Role.FACULTY } }),
  ]);

  // Create Faculty
  const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
  const faculty = await Promise.all(
    facultyUsers.map((user, i) => prisma.faculty.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        employeeId: `FAC${String(i + 1).padStart(4, '0')}`,
        departmentId: departments[i % 5].id,
        designation: designations[i % 4],
        maxWorkload: 3 + (i % 3),
      },
    }))
  );

  console.log('✅ Faculty created');

  // Create Subjects
  const subjectData = [
    // CSE Subjects
    { code: 'CS101', name: 'Programming Fundamentals', departmentId: departments[0].id, credits: 4, examDuration: 180 },
    { code: 'CS102', name: 'Data Structures', departmentId: departments[0].id, credits: 4, examDuration: 180 },
    { code: 'CS201', name: 'Algorithms', departmentId: departments[0].id, credits: 4, examDuration: 180 },
    { code: 'CS202', name: 'Database Systems', departmentId: departments[0].id, credits: 3, examDuration: 150 },
    { code: 'CS301', name: 'Operating Systems', departmentId: departments[0].id, credits: 3, examDuration: 150 },
    { code: 'CS302', name: 'Computer Networks', departmentId: departments[0].id, credits: 3, examDuration: 150 },
    { code: 'CS401', name: 'Machine Learning', departmentId: departments[0].id, credits: 3, examDuration: 180 },
    { code: 'CS402', name: 'Software Engineering', departmentId: departments[0].id, credits: 3, examDuration: 150 },
    { code: 'CS403', name: 'Compiler Design', departmentId: departments[0].id, credits: 3, examDuration: 150 },
    { code: 'CS404', name: 'Distributed Systems', departmentId: departments[0].id, credits: 3, examDuration: 180 },
    // ECE Subjects
    { code: 'EC101', name: 'Basic Electronics', departmentId: departments[1].id, credits: 4, examDuration: 180 },
    { code: 'EC102', name: 'Digital Logic Design', departmentId: departments[1].id, credits: 4, examDuration: 180 },
    { code: 'EC201', name: 'Signals & Systems', departmentId: departments[1].id, credits: 3, examDuration: 150 },
    { code: 'EC202', name: 'Analog Circuits', departmentId: departments[1].id, credits: 3, examDuration: 150 },
    { code: 'EC301', name: 'Microprocessors', departmentId: departments[1].id, credits: 3, examDuration: 150 },
    { code: 'EC302', name: 'Communication Systems', departmentId: departments[1].id, credits: 3, examDuration: 150 },
    { code: 'EC401', name: 'VLSI Design', departmentId: departments[1].id, credits: 3, examDuration: 180 },
    { code: 'EC402', name: 'Digital Signal Processing', departmentId: departments[1].id, credits: 3, examDuration: 180 },
    { code: 'EC403', name: 'Wireless Communication', departmentId: departments[1].id, credits: 3, examDuration: 150 },
    { code: 'EC404', name: 'Embedded Systems', departmentId: departments[1].id, credits: 3, examDuration: 150 },
    // MECH Subjects
    { code: 'ME101', name: 'Engineering Mechanics', departmentId: departments[2].id, credits: 4, examDuration: 180 },
    { code: 'ME102', name: 'Thermodynamics', departmentId: departments[2].id, credits: 4, examDuration: 180 },
    { code: 'ME201', name: 'Fluid Mechanics', departmentId: departments[2].id, credits: 3, examDuration: 150 },
    { code: 'ME202', name: 'Strength of Materials', departmentId: departments[2].id, credits: 3, examDuration: 150 },
    { code: 'ME301', name: 'Machine Design', departmentId: departments[2].id, credits: 3, examDuration: 180 },
    { code: 'ME302', name: 'Heat Transfer', departmentId: departments[2].id, credits: 3, examDuration: 150 },
    { code: 'ME401', name: 'Manufacturing Technology', departmentId: departments[2].id, credits: 3, examDuration: 150 },
    { code: 'ME402', name: 'Automobile Engineering', departmentId: departments[2].id, credits: 3, examDuration: 150 },
    { code: 'ME403', name: 'Robotics', departmentId: departments[2].id, credits: 3, examDuration: 180 },
    { code: 'ME404', name: 'Finite Element Analysis', departmentId: departments[2].id, credits: 3, examDuration: 180 },
    // CIVIL Subjects
    { code: 'CE101', name: 'Surveying', departmentId: departments[3].id, credits: 4, examDuration: 180 },
    { code: 'CE102', name: 'Building Materials', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE201', name: 'Structural Analysis', departmentId: departments[3].id, credits: 4, examDuration: 180 },
    { code: 'CE202', name: 'Concrete Technology', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE301', name: 'Geotechnical Engineering', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE302', name: 'Transportation Engineering', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE401', name: 'Environmental Engineering', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE402', name: 'Construction Management', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE403', name: 'Water Resources', departmentId: departments[3].id, credits: 3, examDuration: 150 },
    { code: 'CE404', name: 'Earthquake Engineering', departmentId: departments[3].id, credits: 3, examDuration: 180 },
    // IT Subjects
    { code: 'IT101', name: 'Web Technologies', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT102', name: 'Computer Organization', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT201', name: 'Object Oriented Programming', departmentId: departments[4].id, credits: 4, examDuration: 180 },
    { code: 'IT202', name: 'System Analysis & Design', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT301', name: 'Information Security', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT302', name: 'Cloud Computing', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT401', name: 'Big Data Analytics', departmentId: departments[4].id, credits: 3, examDuration: 180 },
    { code: 'IT402', name: 'Mobile Application Development', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT403', name: 'IoT Fundamentals', departmentId: departments[4].id, credits: 3, examDuration: 150 },
    { code: 'IT404', name: 'Artificial Intelligence', departmentId: departments[4].id, credits: 3, examDuration: 180 },
  ];

  const subjects = await Promise.all(
    subjectData.map(s => prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    }))
  );

  console.log('✅ Subjects created');

  // Create Rooms
  const roomData = [
    { code: 'R101', name: 'Lecture Hall 101', capacity: 30, building: 'A', floor: 1, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R102', name: 'Lecture Hall 102', capacity: 40, building: 'A', floor: 1, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R103', name: 'Lecture Hall 103', capacity: 40, building: 'A', floor: 1, hasProjector: true, hasAC: false, isAccessible: true },
    { code: 'R201', name: 'Lecture Hall 201', capacity: 50, building: 'A', floor: 2, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R202', name: 'Lecture Hall 202', capacity: 50, building: 'A', floor: 2, hasProjector: true, hasAC: true, isAccessible: false },
    { code: 'R203', name: 'Lecture Hall 203', capacity: 60, building: 'A', floor: 2, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R301', name: 'Lecture Hall 301', capacity: 60, building: 'B', floor: 3, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R302', name: 'Lecture Hall 302', capacity: 80, building: 'B', floor: 3, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R401', name: 'Auditorium 401', capacity: 100, building: 'C', floor: 1, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R402', name: 'Auditorium 402', capacity: 120, building: 'C', floor: 1, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R501', name: 'Main Auditorium', capacity: 200, building: 'C', floor: 1, hasProjector: true, hasAC: true, isAccessible: true },
    { code: 'R502', name: 'Grand Hall', capacity: 300, building: 'C', floor: 2, hasProjector: true, hasAC: true, isAccessible: true },
  ];

  const rooms = await Promise.all(
    roomData.map(r => prisma.room.upsert({
      where: { code: r.code },
      update: {},
      create: { ...r, departmentId: departments[Math.floor(Math.random() * 5)].id },
    }))
  );

  console.log('✅ Rooms created');

  // Create Seat Layouts
  await Promise.all(
    rooms.map(room => {
      const rows = Math.ceil(Math.sqrt(room.capacity / 2));
      const cols = Math.ceil(room.capacity / rows);
      return prisma.seatLayout.upsert({
        where: { roomId: room.id },
        update: {},
        create: { roomId: room.id, rows, columns: cols },
      });
    })
  );

  console.log('✅ Seat layouts created');

  // Create Students (500 students across 5 departments, 8 semesters, 2 sections each)
  const students = [];
  for (let i = 0; i < 500; i++) {
    const dept = departments[i % 5];
    const semester = (i % 8) + 1;
    const section = i % 2 === 0 ? 'A' : 'B';
    const studentId = `${dept.code}${semester}${section}${String(Math.floor(i / 10) + 1).padStart(3, '0')}`;
    
    const user = await prisma.user.upsert({
      where: { email: `student${i + 1}@college.edu` },
      update: {},
      create: { email: `student${i + 1}@college.edu`, passwordHash, role: Role.STUDENT },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        studentId,
        departmentId: dept.id,
        semester,
        section,
      },
    });
    students.push(student);
  }

  console.log('✅ Students created');

  // Create Enrollments (each student enrolled in 5-7 subjects from their department)
  const deptSubjects = new Map();
  for (const subject of subjects) {
    if (!deptSubjects.has(subject.departmentId)) {
      deptSubjects.set(subject.departmentId, []);
    }
    deptSubjects.get(subject.departmentId).push(subject);
  }

  for (const student of students) {
    const deptSubjs = deptSubjects.get(student.departmentId) || [];
    const numSubjects = 5 + Math.floor(Math.random() * 3);
    const selectedSubjects = deptSubjs
      .filter(s => {
        const subjSem = parseInt(s.code.slice(-3)) || 1;
        return subjSem <= student.semester * 2;
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, numSubjects);

    await Promise.all(
      selectedSubjects.map(subj =>
        prisma.enrollment.upsert({
          where: { studentId_subjectId: { studentId: student.id, subjectId: subj.id } },
          update: {},
          create: { studentId: student.id, subjectId: subj.id },
        })
      )
    );
  }

  console.log('✅ Enrollments created');

  // Create Exams (30 exams)
  const examTypes = [ExamType.REGULAR, ExamType.SUPPLEMENTARY, ExamType.PRACTICAL];
  const exams = await Promise.all(
    subjects.slice(0, 30).map((subject, i) => prisma.exam.upsert({
      where: { id: `exam-${i + 1}` },
      update: {},
      create: {
        id: `exam-${i + 1}`,
        subjectId: subject.id,
        examType: examTypes[i % 3],
        duration: subject.examDuration,
        maxStudents: subject.departmentId === departments[0].id ? 120 : 80,
        status: ExamStatus.DRAFT,
      },
    }))
  );

  console.log('✅ Exams created');

  // Create Exam Registrations (students registered for exams of their enrolled subjects)
  for (const student of students) {
    const enrollments = await prisma.enrollment.findMany({ where: { studentId: student.id } });
    const subjectIds = enrollments.map(e => e.subjectId);
    const studentExams = exams.filter(e => subjectIds.includes(e.subjectId));
    
    for (const exam of studentExams) {
      await prisma.examRegistration.upsert({
        where: { studentId_examId: { studentId: student.id, examId: exam.id } },
        update: {},
        create: { studentId: student.id, examId: exam.id, status: RegStatus.REGISTERED },
      });
    }
  }

  console.log('✅ Exam registrations created');

  // Create Constraints
  const constraints = [
    { name: 'No Student Conflict', type: 'NO_STUDENT_CONFLICT', priority: 100, config: {} },
    { name: 'No Room Conflict', type: 'NO_ROOM_CONFLICT', priority: 100, config: {} },
    { name: 'Room Capacity', type: 'ROOM_CAPACITY', priority: 100, config: {} },
    { name: 'No Faculty Conflict', type: 'NO_FACULTY_CONFLICT', priority: 100, config: {} },
    { name: 'Min Gap Between Exams', type: 'MIN_GAP_BETWEEN_EXAMS', priority: 50, config: { minHours: 2 } },
    { name: 'Max Exams Per Day', type: 'MAX_EXAMS_PER_DAY', priority: 50, config: { maxPerDay: 2 } },
    { name: 'Balance Room Utilization', type: 'BALANCE_ROOM_UTILIZATION', priority: 30, config: {} },
    { name: 'Balance Invigilator Workload', type: 'BALANCE_INVIGILATOR_WORKLOAD', priority: 30, config: {} },
    { name: 'Anti-Cheating Seating', type: 'ANTI_CHEATING_SEATING', priority: 40, config: { separateSameSubject: true, separateSameSection: true } },
  ];

  await Promise.all(
    constraints.map(c => prisma.constraint.upsert({
      where: { id: `constraint-${c.type}` },
      update: {},
      create: { ...c, id: `constraint-${c.type}` },
    }))
  );

  console.log('✅ Constraints created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });