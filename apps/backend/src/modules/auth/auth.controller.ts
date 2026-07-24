import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtGuard } from './guards/jwt.guard';
import { AuthService } from './services/auth.service';
import { JwtPayload } from './services/jwt.service';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('patient/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendPatientOtp(@Body() dto: SendOtpDto) {
    const delivery = await this.auth.sendPatientOtp(dto.mobileNumber);
    return { message: 'OTP sent.', ...(delivery.demoOtp ? { demoOtp: delivery.demoOtp } : {}) };
  }

  @Post('patient/verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPatientOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.verifyPatientOtp(dto.mobileNumber, dto.otp);
    if (!('tokens' in result)) return result;
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return { user: this.publicUser(result.user), accessToken: result.tokens.accessToken, redirectTo: result.redirectTo };
  }

  @Post('patient/register')
  async registerPatient(@Body() dto: RegisterPatientDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.registerPatient(dto);
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return { user: this.publicUser(result.user), accessToken: result.tokens.accessToken, redirectTo: result.redirectTo };
  }

  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  async staffLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.loginStaff(dto);
    this.setRefreshCookie(response, result.tokens.refreshToken);
    return { user: this.publicUser(result.user), accessToken: result.tokens.accessToken, redirectTo: result.redirectTo, forcePasswordChange: result.forcePasswordChange };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(@Req() request: Request & { user: JwtPayload; cookies: Record<string, string> }, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.auth.refresh(request.user.sub, request.cookies.refreshToken);
    this.setRefreshCookie(response, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request & { user: JwtPayload }, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.user.sub);
    response.clearCookie('refreshToken', { path: '/api/v1/auth' });
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth' });
  }

  private publicUser(user: { id: string; fullName: string; role: string; hospitalId?: string }) {
    return { id: user.id, fullName: user.fullName, role: user.role, hospitalId: user.hospitalId };
  }
}