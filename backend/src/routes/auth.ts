import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
} from '../controllers/auth';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['ADMIN', 'FACULTY', 'STUDENT']).default('STUDENT'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

router.post('/register', requireAuth, requireAdmin, validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;