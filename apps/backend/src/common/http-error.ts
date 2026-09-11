export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly error: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, message, 'Bad Request');
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message, 'Unauthorized');
export const forbidden = (message = 'Forbidden resource') => new HttpError(403, message, 'Forbidden');
export const notFound = (message: string) => new HttpError(404, message, 'Not Found');
export const conflict = (message: string) => new HttpError(409, message, 'Conflict');
export const tooManyRequests = (message: string) => new HttpError(429, message, 'Too Many Requests');
