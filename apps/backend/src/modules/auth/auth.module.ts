import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { redisStore } from 'cache-manager-redis-yet';
import { AuthController } from './auth.controller';
import { JwtGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { OTP_PROVIDER } from './interfaces/otp-provider.interface';
import { DemoOtpProvider } from './providers/demo-otp.provider';
import { SmsProvider } from './providers/sms.provider';
import { AuthService } from './services/auth.service';
import { AuthJwtService } from './services/jwt.service';
import { OtpService } from './services/otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [ConfigModule, PassportModule, CacheModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: async (config: ConfigService) => ({ store: await redisStore({ url: config.getOrThrow<string>('REDIS_URL') }) }) }), JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_ACCESS_SECRET') }) })],
  controllers: [AuthController],
  providers: [AuthService, AuthJwtService, OtpService, DemoOtpProvider, SmsProvider, JwtStrategy, RefreshStrategy, JwtGuard, RolesGuard, { provide: OTP_PROVIDER, inject: [ConfigService, DemoOtpProvider, SmsProvider], useFactory: (config: ConfigService, demo: DemoOtpProvider, sms: SmsProvider) => config.get<string>('NODE_ENV') === 'production' ? sms : demo }],
  exports: [AuthService, JwtGuard, RolesGuard],
})
export class AuthModule {}