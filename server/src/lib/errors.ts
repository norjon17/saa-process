export class AppError extends Error {
  override readonly name = 'AppError';
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;
  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found`);
export const badRequest = (message: string, details?: unknown) => new AppError(400, 'BAD_REQUEST', message, details);
export const conflict = (message: string, details?: unknown) => new AppError(409, 'CONFLICT', message, details);
export const forbidden = (message = 'forbidden') => new AppError(403, 'FORBIDDEN', message);
export const unauthorized = (message = 'not signed in') => new AppError(401, 'UNAUTHORIZED', message);
