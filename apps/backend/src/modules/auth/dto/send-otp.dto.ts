import { IsMobilePhone } from 'class-validator';

export class SendOtpDto {
  @IsMobilePhone('en-IN')
  mobileNumber!: string;
}
