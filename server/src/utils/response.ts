// Standardized API response helpers

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface PaginatedData<T = any> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

import { Response } from 'express';

export function success<T>(res: Response, data: T, message = 'ok', code = 200) {
  const body: ApiResponse<T> = { code, message, data, timestamp: Date.now() };
  res.status(code).json(body);
}

export function fail(res: Response, message: string, code = 400, details?: any) {
  const body: ApiResponse = { code, message, timestamp: Date.now() };
  if (details) (body as any).details = details;
  res.status(code).json(body);
}

export function paginated<T>(res: Response, items: T[], page: number, limit: number, total: number, message = 'ok') {
  const body: ApiResponse<PaginatedData<T>> = {
    code: 200,
    message,
    data: { items, page, limit, total, totalPages: Math.ceil(total / limit) },
    timestamp: Date.now(),
  };
  res.status(200).json(body);
}
