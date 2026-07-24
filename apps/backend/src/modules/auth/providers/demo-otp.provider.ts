import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpDelivery, OtpProvider } from '../interfaces/otp-provider.interface';

@Injectable()
export class DemoOtpProvider implements OtpProvider {
  constructor(private readonly config: ConfigService) {}

  async sendOtp(mobileNumber: string, otp: string): Promise<OtpDelivery> {
    const development = this.config.get<string>('NODE_ENV') !== 'production';
    if (development) {
      // Intentional development-only visibility for hackathon testing.
      console.info(`[DEMO OTP] ${mobileNumber}: ${otp}`);
      return { accepted: true, demoOtp: otp };
    }
    return { accepted: false };
  }
}
