import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';

describe('Validators', () => {
  describe('Department Validators', () => {
    const createSchema = z.object({
      code: z.string().min(2).max(10).toUpperCase(),
      name: z.string().min(2).max(100),
      description: z.string().optional(),
    });

    it('should validate correct department data', () => {
      const data = { code: 'CSE', name: 'Computer Science', description: 'CS Department' };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('CSE');
      }
    });

    it('should reject invalid code (too short)', () => {
      const data = { code: 'C', name: 'Computer Science' };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid code (too long)', () => {
      const data = { code: 'COMPUTERSCIENCE', name: 'Computer Science' };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should auto-uppercase code', () => {
      const data = { code: 'cse', name: 'Computer Science' };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('CSE');
      }
    });
  });

  describe('Student Validators', () => {
    const createSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      studentId: z.string().min(3).max(20).toUpperCase(),
      departmentId: z.string().cuid(),
      semester: z.number().int().min(1).max(10),
      section: z.string().max(5).optional(),
    });

    it('should validate correct student data', () => {
      const data = {
        email: 'student@college.edu',
        password: 'password123',
        studentId: 'CS2023001',
        departmentId: 'clx1234567890abcdef',
        semester: 3,
        section: 'A',
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
        studentId: 'CS2023001',
        departmentId: 'clx1234567890abcdef',
        semester: 3,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const data = {
        email: 'student@college.edu',
        password: 'short',
        studentId: 'CS2023001',
        departmentId: 'clx1234567890abcdef',
        semester: 3,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid semester', () => {
      const data = {
        email: 'student@college.edu',
        password: 'password123',
        studentId: 'CS2023001',
        departmentId: 'clx1234567890abcdef',
        semester: 15,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid cuid', () => {
      const data = {
        email: 'student@college.edu',
        password: 'password123',
        studentId: 'CS2023001',
        departmentId: 'invalid-id',
        semester: 3,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Room Validators', () => {
    const createSchema = z.object({
      code: z.string().min(2).max(20).toUpperCase(),
      name: z.string().min(2).max(100),
      capacity: z.number().int().positive().max(1000),
      departmentId: z.string().cuid().optional(),
      floor: z.number().int().optional(),
      building: z.string().max(50).optional(),
      hasProjector: z.boolean().default(false),
      hasAC: z.boolean().default(false),
      isAccessible: z.boolean().default(false),
    });

    it('should validate correct room data', () => {
      const data = {
        code: 'R101',
        name: 'Lecture Hall 101',
        capacity: 60,
        departmentId: 'clx1234567890abcdef',
        floor: 1,
        building: 'A',
        hasProjector: true,
        hasAC: true,
        isAccessible: true,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject zero or negative capacity', () => {
      const data = {
        code: 'R101',
        name: 'Lecture Hall 101',
        capacity: 0,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject capacity over 1000', () => {
      const data = {
        code: 'R101',
        name: 'Lecture Hall 101',
        capacity: 2000,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should set default boolean values', () => {
      const data = { code: 'R101', name: 'Lecture Hall 101', capacity: 60 };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasProjector).toBe(false);
        expect(result.data.hasAC).toBe(false);
        expect(result.data.isAccessible).toBe(false);
      }
    });
  });

  describe('Exam Validators', () => {
    const createSchema = z.object({
      subjectId: z.string().cuid(),
      examType: z.enum(['REGULAR', 'SUPPLEMENTARY', 'PRACTICAL']).default('REGULAR'),
      duration: z.number().int().positive().max(300),
      maxStudents: z.number().int().positive().optional(),
    });

    it('should validate correct exam data', () => {
      const data = {
        subjectId: 'clx1234567890abcdef',
        examType: 'REGULAR',
        duration: 180,
        maxStudents: 100,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid exam type', () => {
      const data = {
        subjectId: 'clx1234567890abcdef',
        examType: 'INVALID',
        duration: 180,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should default exam type to REGULAR', () => {
      const data = {
        subjectId: 'clx1234567890abcdef',
        duration: 180,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.examType).toBe('REGULAR');
      }
    });

    it('should reject duration over 300 minutes', () => {
      const data = {
        subjectId: 'clx1234567890abcdef',
        duration: 400,
      };
      const result = createSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});