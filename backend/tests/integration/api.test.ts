import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';

const app = createApp();

describe('API Integration Tests', () => {
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.seatAllocation.deleteMany();
    await prisma.invigilatorAssignment.deleteMany();
    await prisma.timetableEntry.deleteMany();
    await prisma.conflict.deleteMany();
    await prisma.timetable.deleteMany();
    await prisma.examRegistration.deleteMany();
    await prisma.examSession.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.student.deleteMany();
    await prisma.faculty.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.room.deleteMany();
    await prisma.department.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Auth', () => {
    it('should register admin user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.edu',
          password: 'password123',
          role: 'ADMIN',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin@test.edu');
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should login admin user', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: { email: 'admin2@test.edu', passwordHash, role: 'ADMIN' },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin2@test.edu', password: 'password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      adminToken = res.body.data.accessToken;
      adminUserId = user.id;
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin2@test.edu', password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should get current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('admin2@test.edu');
    });

    it('should refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('Departments', () => {
    it('should create department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'CSE', name: 'Computer Science', description: 'CS Department' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('CSE');
    });

    it('should get departments', async () => {
      await prisma.department.create({ data: { code: 'ECE', name: 'Electronics' } });

      const res = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
    });

    it('should reject duplicate department code', async () => {
      await prisma.department.create({ data: { code: 'MECH', name: 'Mechanical' } });

      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'MECH', name: 'Mechanical Engineering' })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('Students', () => {
    let deptId: string;

    beforeEach(async () => {
      const dept = await prisma.department.create({ data: { code: 'CSE', name: 'Computer Science' } });
      deptId = dept.id;
    });

    it('should create student', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'student1@test.edu',
          password: 'password123',
          studentId: 'CS2023001',
          departmentId: deptId,
          semester: 3,
          section: 'A',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.studentId).toBe('CS2023001');
    });

    it('should get students with pagination', async () => {
      await prisma.student.create({
        data: {
          user: { create: { email: 's1@test.edu', passwordHash: await bcrypt.hash('p', 12), role: 'STUDENT' } },
          studentId: 'CS2023001',
          departmentId: deptId,
          semester: 3,
        },
      });

      const res = await request(app)
        .get('/api/students?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });
  });

  describe('Rooms', () => {
    let deptId: string;

    beforeEach(async () => {
      const dept = await prisma.department.create({ data: { code: 'CSE', name: 'Computer Science' } });
      deptId = dept.id;
    });

    it('should create room', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'R101',
          name: 'Lecture Hall 101',
          capacity: 60,
          departmentId: deptId,
          floor: 1,
          building: 'A',
          hasProjector: true,
          hasAC: true,
          isAccessible: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.capacity).toBe(60);
    });

    it('should get rooms', async () => {
      await prisma.room.create({
        data: { code: 'R102', name: 'Hall 102', capacity: 50, departmentId: deptId },
      });

      const res = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Exams', () => {
    let deptId: string;
    let subjectId: string;

    beforeEach(async () => {
      const dept = await prisma.department.create({ data: { code: 'CSE', name: 'Computer Science' } });
      deptId = dept.id;
      const subject = await prisma.subject.create({
        data: { code: 'CS101', name: 'Programming', departmentId: deptId, examDuration: 180 },
      });
      subjectId = subject.id;
    });

    it('should create exam', async () => {
      const res = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subjectId,
          examType: 'REGULAR',
          duration: 180,
          maxStudents: 100,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subjectId).toBe(subjectId);
    });

    it('should get exams', async () => {
      await prisma.exam.create({
        data: { subjectId, examType: 'REGULAR', duration: 150 },
      });

      const res = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});