import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { LoginDto } from '../dto/login.dto';
import { RegisterPatientDto } from '../dto/register-patient.dto';
import { AUTH_USER_REPOSITORY, AuthUser, AuthUserRepository } from '../interfaces/auth-user-repository.interface';
import { AuthJwtService, AuthTokens } from './jwt.service';
import { OtpService } from './otp.service';

export type LoginResult = { user: AuthUser; tokens: AuthTokens; redirectTo: '/doctor/dashboard' | '/hospital/dashboard' | '/patient/dashboard'; forcePasswordChange?: boolean };

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository, private readonly otp: OtpService, private readonly jwt: AuthJwtService) {}
  async sendPatientOtp(mobileNumber: string) { return this.otp.send(mobileNumber); }
  async verifyPatientOtp(mobileNumber: string, otp: string) { await this.otp.verify(mobileNumber, otp); const patient = await this.users.findPatientByMobile(mobileNumber); return patient ? { registrationRequired: false, ...(await this.complete(patient, '/patient/dashboard')) } : { registrationRequired: true, mobileNumber }; }
  async registerPatient(dto: RegisterPatientDto): Promise<LoginResult> { await this.otp.consumeVerifiedRegistration(dto.mobileNumber); if (await this.users.findPatientByMobile(dto.mobileNumber)) throw new ConflictException('A patient with this mobile number already exists.'); return this.complete(await this.users.createPatient(dto), '/patient/dashboard'); }
  async loginStaff(dto: LoginDto): Promise<LoginResult> { const user = await this.users.findStaffByEmployeeId(dto.employeeId); if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, dto.password))) throw new UnauthorizedException('Invalid employee ID or password.'); return this.complete(user, user.role === 'DOCTOR' ? '/doctor/dashboard' : '/hospital/dashboard', user.temporaryPassword === true); }
  async refresh(userId: string, refreshToken: string): Promise<AuthTokens> { const user = await this.users.findById(userId); if (!user?.refreshTokenHash || !(await argon2.verify(user.refreshTokenHash, refreshToken))) throw new UnauthorizedException('Invalid refresh token.'); return this.persistTokens(user); }
  async logout(userId: string): Promise<void> { await this.users.setRefreshTokenHash(userId, null); }
  private async complete(user: AuthUser, redirectTo: LoginResult['redirectTo'], forcePasswordChange = false): Promise<LoginResult> { return { user, tokens: await this.persistTokens(user), redirectTo, forcePasswordChange }; }
  private async persistTokens(user: AuthUser): Promise<AuthTokens> { const tokens = await this.jwt.issue(user); await this.users.setRefreshTokenHash(user.id, await argon2.hash(tokens.refreshToken)); return tokens; }
}