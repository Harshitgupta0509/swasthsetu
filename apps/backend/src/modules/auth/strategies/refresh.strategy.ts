import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../services/jwt.service';

const refreshCookie = (request: { cookies?: Record<string, string> }) => request.cookies?.refreshToken ?? null;

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({ jwtFromRequest: ExtractJwt.fromExtractors([refreshCookie]), secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET') });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type.');
    return payload;
  }
}
