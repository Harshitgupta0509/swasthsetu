import { Router } from 'express';
import { asyncHandler, validateBody } from '../../common/express';
import { authenticate, AuthenticatedRequest } from '../auth/middleware/authenticate';
import { AuthJwtService } from '../auth/services/jwt.service';
import { OperationsService } from './operations.service';
import { updateBedSchema, updateBloodSchema, updateLabSchema } from './validation/operation.schemas';

export function createOperationsRouter(operations: OperationsService, jwt: AuthJwtService): Router {
  const router = Router();
  router.use(authenticate(jwt));

  router.get('/lab-reports', asyncHandler(async (request, response) => { response.json(await operations.labReports((request as AuthenticatedRequest).user)); }));
  router.patch('/lab-reports/:id', validateBody(updateLabSchema), asyncHandler(async (request, response) => { response.json(await operations.updateLab((request as AuthenticatedRequest).user, request.params.id, request.body)); }));
  router.get('/blood-stocks', asyncHandler(async (request, response) => { response.json(await operations.blood((request as AuthenticatedRequest).user)); }));
  router.patch('/blood-stocks/:id', validateBody(updateBloodSchema), asyncHandler(async (request, response) => { response.json(await operations.updateBlood((request as AuthenticatedRequest).user, request.params.id, request.body)); }));
  router.get('/beds', asyncHandler(async (request, response) => { response.json(await operations.beds((request as AuthenticatedRequest).user)); }));
  router.patch('/beds/:id', validateBody(updateBedSchema), asyncHandler(async (request, response) => { response.json(await operations.updateBed((request as AuthenticatedRequest).user, request.params.id, request.body)); }));

  return router;
}
