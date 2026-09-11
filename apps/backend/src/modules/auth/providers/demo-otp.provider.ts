import { OtpDelivery, OtpProvider } from '../interfaces/otp-provider.interface';

export class DemoOtpProvider implements OtpProvider {
  constructor(private readonly nodeEnv: string) {}

  async sendOtp(mobileNumber: string, otp: string): Promise<OtpDelivery> {
    const development = this.nodeEnv !== 'production';
    if (development) {
      // Intentional development-only visibility for hackathon testing.
      console.info(`[DEMO OTP] ${mobileNumber}: ${otp}`);
      return { accepted: true, demoOtp: otp };
    }
    return { accepted: false };
  }
}
