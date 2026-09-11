import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, ZodType } from 'zod';
import { HttpError } from './http-error';

export const asyncHandler = (handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (request, response, next) => { void handler(request, response, next).catch(next); };

export const validateBody = (schema: ZodType): RequestHandler => (request, _response, next) => {
  request.body = schema.parse(request.body);
  next();
};

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, `Cannot ${request.method} ${request.originalUrl}`, 'Not Found'));
};

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    response.status(400).json({ statusCode: 400, message: error.issues.map(issue => issue.message), error: 'Bad Request' });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ statusCode: error.statusCode, message: error.message, error: error.error });
    return;
  }
  if (typeof error === 'object' && error !== null && 'status' in error && error.status === 400) {
    response.status(400).json({ statusCode: 400, message: 'Invalid JSON payload.', error: 'Bad Request' });
    return;
  }
  console.error(error);
  response.status(500).json({ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' });
}
