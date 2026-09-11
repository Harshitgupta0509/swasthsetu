import * as argon2 from 'argon2';
import { conflict, unauthorized } from '../../../common/http-error';
import { LoginInput, RegisterPatientInput } from '../validation/auth.schemas';
import { AuthUser, AuthUserRepository } from '../interfaces/auth-user-repository.interface';
import { AuthJwtService, AuthTokens } from './jwt.service';
import { OtpService } from './otp.service';

export type LoginResult = { user: AuthUser; tokens: AuthTokens; redirectTo: '/doctor/dashboard' | '/hospital/dashboard' | '/patient/dashboard'; forcePasswordChange?: boolean };

export class AuthService {
  constructor(
    private readonly users: AuthUserRepository,
    private readonly otp: OtpService,
    private readonly jwt: AuthJwtService,
  ) {}

  async sendPatientOtp(mobileNumber: string) { return this.otp.send(mobileNumber); }

  async verifyPatientOtp(mobileNumber: string, otp: string) {
    await this.otp.verify(mobileNumber, otp);
    const patient = await this.users.findPatientByMobile(mobileNumber);
    return patient
      ? { registrationRequired: false, ...(await this.complete(patient, '/patient/dashboard')) }
      : { registrationRequired: true, mobileNumber };
  }

  async registerPatient(input: RegisterPatientInput): Promise<LoginResult> {
    await this.otp.consumeVerifiedRegistration(input.mobileNumber);
    if (await this.users.findPatientByMobile(input.mobileNumber)) throw conflict('A patient with this mobile number already exists.');
    return this.complete(await this.users.createPatient(input), '/patient/dashboard');
  }

  async loginStaff(input: LoginInput): Promise<LoginResult> {
    const user = await this.users.findStaffByEmployeeId(input.employeeId);
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, input.password))) {
      throw unauthorized('Invalid employee ID or password.');
    }
    return this.complete(user, user.role === 'DOCTOR' ? '/doctor/dashboard' : '/hospital/dashboard', user.temporaryPassword === true);
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.users.findById(userId);
    if (!user?.refreshTokenHash || !(await argon2.verify(user.refreshTokenHash, refreshToken))) {
      throw unauthorized('Invalid refresh token.');
    }
    return this.persistTokens(user);
  }

  async logout(userId: string): Promise<void> { await this.users.setRefreshTokenHash(userId, null); }

  private async complete(user: AuthUser, redirectTo: LoginResult['redirectTo'], forcePasswordChange = false): Promise<LoginResult> {
    return { user, tokens: await this.persistTokens(user), redirectTo, forcePasswordChange };
  }

  private async persistTokens(user: AuthUser): Promise<AuthTokens> {
    const tokens = await this.jwt.issue(user);
    await this.users.setRefreshTokenHash(user.id, await argon2.hash(tokens.refreshToken));
    return tokens;
  }
}
