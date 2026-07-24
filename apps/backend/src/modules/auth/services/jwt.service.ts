import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { AuthRole, AuthUser } from '../interfaces/auth-user-repository.interface';

export interface JwtPayload { sub: string; role: AuthRole; hospitalId?: string; type: 'access' | 'refresh'; }
export interface AuthTokens { accessToken: string; refreshToken: string; }

@Injectable()
export class AuthJwtService {
  constructor(private readonly jwt: NestJwtService, private readonly config: ConfigService) {}

  async issue(user: AuthUser): Promise<AuthTokens> {
    const base = { sub: user.id, role: user.role, hospitalId: user.hospitalId };
    const accessToken = await this.jwt.signAsync({ ...base, type: 'access' }, { expiresIn: '15m', secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') });
    const refreshToken = await this.jwt.signAsync({ ...base, type: 'refresh' }, { expiresIn: '7d', secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
    return { accessToken, refreshToken };
  }

  async verifyRefresh(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync<JwtPayload>(token, { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') });
  }
}
