import { Router } from 'express';
import { asyncHandler, validateBody } from '../../common/express';
import { authenticate, AuthenticatedRequest } from '../auth/middleware/authenticate';
import { AuthJwtService } from '../auth/services/jwt.service';
import { AppointmentsService } from './appointments.service';
import { createAppointmentSchema } from './validation/appointment.schemas';

export function createAppointmentsRouter(appointments: AppointmentsService, jwt: AuthJwtService): Router {
  const router = Router();
  router.use(authenticate(jwt));

  router.get('/', asyncHandler(async (request, response) => { response.json(await appointments.list((request as AuthenticatedRequest).user)); }));
  router.get('/queue', asyncHandler(async (request, response) => { response.json(await appointments.queue((request as AuthenticatedRequest).user)); }));
  router.get('/overview', asyncHandler(async (request, response) => { response.json(await appointments.overview((request as AuthenticatedRequest).user)); }));
  router.get('/patients', asyncHandler(async (request, response) => { response.json(await appointments.patients((request as AuthenticatedRequest).user)); }));
  router.get('/doctors', asyncHandler(async (request, response) => { response.json(await appointments.doctors((request as AuthenticatedRequest).user)); }));
  router.get('/notifications', asyncHandler(async (request, response) => { response.json(await appointments.notifications((request as AuthenticatedRequest).user)); }));
  router.post('/', validateBody(createAppointmentSchema), asyncHandler(async (request, response) => {
    response.status(201).json(await appointments.create((request as AuthenticatedRequest).user, request.body));
  }));
  router.post('/:id/start', asyncHandler(async (request, response) => { response.status(201).json(await appointments.start((request as AuthenticatedRequest).user, request.params.id)); }));
  router.post('/:id/complete', asyncHandler(async (request, response) => { response.status(201).json(await appointments.complete((request as AuthenticatedRequest).user, request.params.id)); }));

  return router;
}
