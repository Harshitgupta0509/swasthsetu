import { createClient } from 'redis';
import { createApp } from './app';
import { RedisKeyValueStore } from './cache/key-value-store';
import { loadEnvironment } from './config/env';
import { PrismaAuthUserRepository } from './database/prisma-auth-user.repository';
import { PrismaService } from './database/prisma.service';
import { AppointmentsService } from './modules/appointments/appointments.service';
import { AuthService } from './modules/auth/services/auth.service';
import { AuthJwtService } from './modules/auth/services/jwt.service';
import { OtpService } from './modules/auth/services/otp.service';
import { DemoOtpProvider } from './modules/auth/providers/demo-otp.provider';
import { SmsProvider } from './modules/auth/providers/sms.provider';
import { OperationsService } from './modules/operations/operations.service';

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment();
  const prisma = new PrismaService();
  const redis = createClient({ url: environment.REDIS_URL });
  redis.on('error', error => console.error('Redis error', error));

  await Promise.all([prisma.$connect(), redis.connect()]);

  const jwt = new AuthJwtService(environment.JWT_ACCESS_SECRET, environment.JWT_REFRESH_SECRET);
  const users = new PrismaAuthUserRepository(prisma);
  const otpProvider = environment.NODE_ENV === 'production' ? new SmsProvider() : new DemoOtpProvider(environment.NODE_ENV);
  const otp = new OtpService(new RedisKeyValueStore(redis), otpProvider);
  const app = createApp({
    auth: new AuthService(users, otp, jwt),
    appointments: new AppointmentsService(prisma),
    operations: new OperationsService(prisma),
    jwt,
    nodeEnv: environment.NODE_ENV,
    frontendOrigin: environment.FRONTEND_ORIGIN,
  });

  const server = app.listen(environment.PORT, () => console.info(`SwasthSetu API listening on port ${environment.PORT}`));
  const shutdown = () => {
    server.close(() => {
      void Promise.all([prisma.$disconnect(), redis.quit()]).finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

bootstrap().catch(error => {
  console.error('Unable to start SwasthSetu API', error);
  process.exit(1);
});
