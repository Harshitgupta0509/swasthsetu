import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import { AppointmentsService } from './modules/appointments/appointments.service';
import { AuthService } from './modules/auth/services/auth.service';
import { AuthJwtService } from './modules/auth/services/jwt.service';
import { OperationsService } from './modules/operations/operations.service';

const accessSecret = 'test-access-secret-at-least-16-chars';
const refreshSecret = 'test-refresh-secret-at-least-16-chars';

describe('Express API contract', () => {
  const jwt = new AuthJwtService(accessSecret, refreshSecret);
  const auth = {
    sendPatientOtp: vi.fn(),
    verifyPatientOtp: vi.fn(),
    registerPatient: vi.fn(),
    loginStaff: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  } as unknown as AuthService;
  const appointments = {
    list: vi.fn(), queue: vi.fn(), overview: vi.fn(), patients: vi.fn(), doctors: vi.fn(),
    notifications: vi.fn(), create: vi.fn(), start: vi.fn(), complete: vi.fn(),
  } as unknown as AppointmentsService;
  const operations = {
    labReports: vi.fn(), updateLab: vi.fn(), blood: vi.fn(), updateBlood: vi.fn(), beds: vi.fn(), updateBed: vi.fn(),
  } as unknown as OperationsService;
  const app = createApp({ auth, appointments, operations, jwt, nodeEnv: 'test', frontendOrigin: 'http://127.0.0.1:4173' });

  beforeEach(() => vi.clearAllMocks());

  it('reports service health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('keeps the patient OTP endpoint and response shape', async () => {
    vi.mocked(auth.sendPatientOtp).mockResolvedValue({ accepted: true, demoOtp: '123456' });
    const response = await request(app).post('/api/v1/auth/patient/send-otp').send({ mobileNumber: '9000000001' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'OTP sent.', demoOtp: '123456' });
  });

  it('rejects invalid and unknown request fields like the former global validation pipe', async () => {
    const response = await request(app).post('/api/v1/auth/patient/send-otp').send({ mobileNumber: '123', unexpected: true });
    expect(response.status).toBe(400);
    expect(response.body.statusCode).toBe(400);
    expect(auth.sendPatientOtp).not.toHaveBeenCalled();
  });

  it('returns a client error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/v1/auth/patient/send-otp')
      .set('Content-Type', 'application/json')
      .send('{not-json');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid JSON payload.');
  });

  it('preserves login JSON and refresh-token cookie behavior', async () => {
    vi.mocked(auth.loginStaff).mockResolvedValue({
      user: { id: 'user-1', fullName: 'Hospital Admin', role: 'HOSPITAL_ADMIN', hospitalId: 'safdarjung' },
      tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
      redirectTo: '/hospital/dashboard',
      forcePasswordChange: false,
    });
    const response = await request(app).post('/api/v1/auth/staff/login').send({ employeeId: 'HA-1001', password: 'ChangeMe123!' });
    expect(response.status).toBe(200);
    expect(response.body.redirectTo).toBe('/hospital/dashboard');
    expect(response.body.accessToken).toBe('access-token');
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=refresh-token');
    expect(response.headers['set-cookie'][0]).toContain('Path=/api/v1/auth');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('protects private endpoints', async () => {
    const response = await request(app).get('/api/v1/appointments');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

  it('accepts a valid access token and returns appointment data unchanged', async () => {
    const { accessToken } = await jwt.issue({ id: 'user-1', fullName: 'Doctor', role: 'DOCTOR', hospitalId: 'safdarjung' });
    vi.mocked(appointments.list).mockResolvedValue([{ id: 'appointment-1', status: 'WAITING' }] as never);
    const response = await request(app).get('/api/v1/appointments').set('Authorization', `Bearer ${accessToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'appointment-1', status: 'WAITING' }]);
    expect(appointments.list).toHaveBeenCalledWith(expect.objectContaining({ sub: 'user-1', role: 'DOCTOR' }));
  });

  it('returns a Nest-compatible 404 error shape', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ statusCode: 404, message: 'Cannot GET /api/v1/does-not-exist', error: 'Not Found' });
  });
});
