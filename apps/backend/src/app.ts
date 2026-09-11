import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express } from 'express';
import { errorHandler, notFoundHandler } from './common/express';
import { createAppointmentsRouter } from './modules/appointments/appointments.routes';
import { AppointmentsService } from './modules/appointments/appointments.service';
import { createAuthRouter } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/services/auth.service';
import { AuthJwtService } from './modules/auth/services/jwt.service';
import { createOperationsRouter } from './modules/operations/operations.routes';
import { OperationsService } from './modules/operations/operations.service';

export interface ApplicationDependencies {
  auth: AuthService;
  appointments: AppointmentsService;
  operations: OperationsService;
  jwt: AuthJwtService;
  nodeEnv: string;
  frontendOrigin: string;
}

export function createApp(dependencies: ApplicationDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin: dependencies.nodeEnv === 'production' ? dependencies.frontendOrigin : true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/v1/auth', createAuthRouter(dependencies.auth, dependencies.jwt, dependencies.nodeEnv === 'production'));
  app.use('/api/v1/appointments', createAppointmentsRouter(dependencies.appointments, dependencies.jwt));
  app.use('/api/v1/operations', createOperationsRouter(dependencies.operations, dependencies.jwt));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
