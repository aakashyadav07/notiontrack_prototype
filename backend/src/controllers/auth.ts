import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticationError, ValidationError, ConflictError, NotFoundError } from '../utils/errors';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../config/jwt';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'FACULTY', 'STUDENT']).default('STUDENT'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, role: data.role },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  });

  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json(successResponse({ user, accessToken }));
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.isActive) throw new AuthenticationError('Invalid credentials');

  const isValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValid) throw new AuthenticationError('Invalid credentials');

  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json(successResponse({
    user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive },
    accessToken,
  }));
});

export const refresh = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const data = refreshSchema.parse(req.body);
  const refreshToken = data.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) throw new AuthenticationError('Refresh token required');

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new AuthenticationError('Invalid or expired refresh token');

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) throw new AuthenticationError('User not found or inactive');

  const newPayload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json(successResponse({ accessToken }));
});

export const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.json(successResponse({ message: 'Logged out successfully' }));
});

export const me = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  if (!authReq.user) throw new AuthenticationError('Not authenticated');

  const user = await prisma.user.findUnique({
    where: { id: authReq.user.userId },
    select: { id: true, email: true, role: true, isActive: true, createdAt: true },
  });

  if (!user) throw new NotFoundError('User', authReq.user.userId);

  let profile = null;
  if (user.role === 'STUDENT') {
    profile = await prisma.student.findUnique({
      where: { userId: user.id },
      include: { department: true },
    });
  } else if (user.role === 'FACULTY') {
    profile = await prisma.faculty.findUnique({
      where: { userId: user.id },
      include: { department: true },
    });
  }

  res.json(successResponse({ user, profile }));
});

export const changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as any;
  if (!authReq.user) throw new AuthenticationError('Not authenticated');

  const data = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: authReq.user.userId } });
  if (!user) throw new NotFoundError('User', authReq.user.userId);

  const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isValid) throw new ValidationError('Current password is incorrect');

  const newPasswordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newPasswordHash } });

  res.json(successResponse({ message: 'Password changed successfully' }));
});