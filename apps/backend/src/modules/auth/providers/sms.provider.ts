import { Injectable } from '@nestjs/common';
import { OtpDelivery, OtpProvider } from '../interfaces/otp-provider.interface';

/** Replace this adapter with MSG91, Twilio, or Textlocal in production. */
@Injectable()
export class SmsProvider implements OtpProvider {
  async sendOtp(_mobileNumber: string, _otp: string): Promise<OtpDelivery> {
    throw new Error('A production SMS provider has not been configured.');
  }
}
