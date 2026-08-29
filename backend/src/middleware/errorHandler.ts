import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse';
import { isAppError, AppError } from '../utils/errors';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  if (isAppError(err)) {
    res.status(err.statusCode).json(
      errorResponse(err.code, err.message, err.details)
    );
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
    res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Invalid request data', details)
    );
    return;
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json(
        errorResponse('DUPLICATE_ENTRY', `A record with this ${target} already exists`)
      );
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json(
        errorResponse('NOT_FOUND', 'Record not found')
      );
      return;
    }
  }

  if (err instanceof PrismaClientValidationError) {
    res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Invalid data provided')
    );
    return;
  }

  res.status(500).json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred')
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(
    errorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`)
  );
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}