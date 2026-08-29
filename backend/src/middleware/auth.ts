import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../config/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Access token required');
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  if (!payload || payload.type !== 'access') {
    throw new AuthenticationError('Invalid or expired access token');
  }

  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(`Required role: ${roles.join(' or ')}`);
    }

    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole('ADMIN')(req, res, next);
}

export function requireFacultyOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRole('ADMIN', 'FACULTY')(req, res, next);
}

export async function requireOwnershipOrAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  resourceUserId: string
): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (req.user.role === 'ADMIN' || req.user.userId === resourceUserId) {
    next();
    return;
  }

  throw new AuthorizationError('Access denied');
}

export async function attachUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    if (payload && payload.type === 'access') {
      req.user = payload;
    }
  }
  
  next();
}