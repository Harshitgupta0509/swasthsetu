import jwt, { JwtPayload as JsonWebTokenPayload } from 'jsonwebtoken';
import { unauthorized } from '../../../common/http-error';
import { AuthRole, AuthUser } from '../interfaces/auth-user-repository.interface';

export interface JwtPayload extends JsonWebTokenPayload {
  sub: string;
  role: AuthRole;
  hospitalId?: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens { accessToken: string; refreshToken: string; }

export class AuthJwtService {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
  ) {}

  async issue(user: AuthUser): Promise<AuthTokens> {
    const base = { sub: user.id, role: user.role, hospitalId: user.hospitalId };
    const accessToken = jwt.sign({ ...base, type: 'access' }, this.accessSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ ...base, type: 'refresh' }, this.refreshSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  verifyAccess(token: string): JwtPayload {
    return this.verify(token, this.accessSecret, 'access');
  }

  verifyRefresh(token: string): JwtPayload {
    return this.verify(token, this.refreshSecret, 'refresh');
  }

  private verify(token: string, secret: string, expectedType: JwtPayload['type']): JwtPayload {
    try {
      const payload = jwt.verify(token, secret);
      if (typeof payload === 'string' || payload.type !== expectedType || typeof payload.sub !== 'string') {
        throw unauthorized('Invalid token type.');
      }
      return payload as JwtPayload;
    } catch (error) {
      if (error instanceof Error && error.name === 'HttpError') throw error;
      throw unauthorized('Invalid or expired token.');
    }
  }
}
