import { NextFunction, Request, RequestHandler, Response } from 'express';
import { unauthorized } from '../../../common/http-error';
import { AuthJwtService, JwtPayload } from '../services/jwt.service';

export type AuthenticatedRequest = Request & { user: JwtPayload };

export function authenticate(jwt: AuthJwtService): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) return next(unauthorized());
    try {
      (request as AuthenticatedRequest).user = jwt.verifyAccess(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}
