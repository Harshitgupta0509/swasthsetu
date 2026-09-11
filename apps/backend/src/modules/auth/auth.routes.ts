import { Router, Response } from 'express';
import { asyncHandler, validateBody } from '../../common/express';
import { unauthorized } from '../../common/http-error';
import { authenticate, AuthenticatedRequest } from './middleware/authenticate';
import { AuthService } from './services/auth.service';
import { AuthJwtService } from './services/jwt.service';
import { loginSchema, registerPatientSchema, sendOtpSchema, verifyOtpSchema } from './validation/auth.schemas';

const refreshCookieOptions = (production: boolean) => ({
  httpOnly: true,
  secure: production,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
});

const publicUser = (user: { id: string; fullName: string; role: string; hospitalId?: string }) => ({
  id: user.id,
  fullName: user.fullName,
  role: user.role,
  hospitalId: user.hospitalId,
});

export function createAuthRouter(auth: AuthService, jwt: AuthJwtService, production: boolean): Router {
  const router = Router();

  router.post('/patient/send-otp', validateBody(sendOtpSchema), asyncHandler(async (request, response) => {
    const delivery = await auth.sendPatientOtp(request.body.mobileNumber);
    response.json({ message: 'OTP sent.', ...(delivery.demoOtp ? { demoOtp: delivery.demoOtp } : {}) });
  }));

  router.post('/patient/verify-otp', validateBody(verifyOtpSchema), asyncHandler(async (request, response) => {
    const result = await auth.verifyPatientOtp(request.body.mobileNumber, request.body.otp);
    if (!('tokens' in result)) {
      response.json(result);
      return;
    }
    response.cookie('refreshToken', result.tokens.refreshToken, refreshCookieOptions(production));
    response.json({ user: publicUser(result.user), accessToken: result.tokens.accessToken, redirectTo: result.redirectTo });
  }));

  router.post('/patient/register', validateBody(registerPatientSchema), asyncHandler(async (request, response) => {
    const result = await auth.registerPatient(request.body);
    response.cookie('refreshToken', result.tokens.refreshToken, refreshCookieOptions(production));
    response.status(201).json({ user: publicUser(result.user), accessToken: result.tokens.accessToken, redirectTo: result.redirectTo });
  }));

  router.post('/staff/login', validateBody(loginSchema), asyncHandler(async (request, response) => {
    const result = await auth.loginStaff(request.body);
    response.cookie('refreshToken', result.tokens.refreshToken, refreshCookieOptions(production));
    response.json({ user: publicUser(result.user), accessToken: result.tokens.accessToken, redirectTo: result.redirectTo, forcePasswordChange: result.forcePasswordChange });
  }));

  router.post('/refresh', asyncHandler(async (request, response) => {
    const refreshToken = request.cookies?.refreshToken as string | undefined;
    if (!refreshToken) throw unauthorized();
    const payload = jwt.verifyRefresh(refreshToken);
    const tokens = await auth.refresh(payload.sub, refreshToken);
    response.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions(production));
    response.status(201).json({ accessToken: tokens.accessToken });
  }));

  router.post('/logout', authenticate(jwt), asyncHandler(async (request, response) => {
    await auth.logout((request as AuthenticatedRequest).user.sub);
    response.clearCookie('refreshToken', { path: '/api/v1/auth' });
    response.status(204).send();
  }));

  return router;
}
