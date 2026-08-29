export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export function successResponse<T>(data: T, meta?: ResponseMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

export function errorResponse(code: string, message: string, details?: any): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, details },
  };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}