import { IsMobilePhone, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsMobilePhone('en-IN')
  mobileNumber!: string;

  @Matches(/^\d{6}$/)
  otp!: string;
}
