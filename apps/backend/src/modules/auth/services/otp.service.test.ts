import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from '../../../cache/key-value-store';
import { OtpProvider } from '../interfaces/otp-provider.interface';
import { OtpService } from './otp.service';

class CapturingProvider implements OtpProvider {
  latestOtp = '';
  async sendOtp(_mobileNumber: string, otp: string) {
    this.latestOtp = otp;
    return { accepted: true, demoOtp: otp };
  }
}

describe('OtpService', () => {
  it('issues and verifies a six-digit OTP', async () => {
    const provider = new CapturingProvider();
    const service = new OtpService(new MemoryKeyValueStore(), provider);
    const delivery = await service.send('9000000001');
    expect(delivery.demoOtp).toMatch(/^\d{6}$/);
    await expect(service.verify('9000000001', provider.latestOtp)).resolves.toBeUndefined();
    await expect(service.consumeVerifiedRegistration('9000000001')).resolves.toBeUndefined();
  });

  it('enforces the resend cooldown', async () => {
    const service = new OtpService(new MemoryKeyValueStore(), new CapturingProvider());
    await service.send('9000000001');
    await expect(service.send('9000000001')).rejects.toMatchObject({ statusCode: 429 });
  });
});
