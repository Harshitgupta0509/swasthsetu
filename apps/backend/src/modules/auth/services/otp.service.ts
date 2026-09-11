import * as argon2 from 'argon2';
import { randomInt } from 'crypto';
import { KeyValueStore } from '../../../cache/key-value-store';
import { tooManyRequests, unauthorized } from '../../../common/http-error';
import { OtpDelivery, OtpProvider } from '../interfaces/otp-provider.interface';

type OtpRecord = { hash: string; attempts: number; expiresAt: number };

export class OtpService {
  private readonly ttlMilliseconds = 5 * 60 * 1000;
  private readonly cooldownMilliseconds = 60 * 1000;
  private readonly maximumAttempts = 5;

  constructor(
    private readonly cache: KeyValueStore,
    private readonly provider: OtpProvider,
  ) {}

  async send(mobileNumber: string): Promise<OtpDelivery> {
    const cooldownKey = this.cooldownKey(mobileNumber);
    if (await this.cache.get(cooldownKey)) throw tooManyRequests('Please wait before requesting another OTP.');
    const otp = randomInt(100000, 1000000).toString();
    const record: OtpRecord = { hash: await argon2.hash(otp), attempts: 0, expiresAt: Date.now() + this.ttlMilliseconds };
    await this.cache.set(this.otpKey(mobileNumber), record, this.ttlMilliseconds);
    await this.cache.set(cooldownKey, true, this.cooldownMilliseconds);
    return this.provider.sendOtp(mobileNumber, otp);
  }

  async verify(mobileNumber: string, otp: string): Promise<void> {
    const key = this.otpKey(mobileNumber);
    const record = await this.cache.get<OtpRecord>(key);
    if (!record || record.expiresAt <= Date.now()) {
      await this.cache.delete(key);
      throw unauthorized('OTP has expired or was not requested.');
    }
    if (record.attempts >= this.maximumAttempts) {
      await this.cache.delete(key);
      throw tooManyRequests('Maximum OTP attempts reached. Request a new OTP.');
    }
    if (!(await argon2.verify(record.hash, otp))) {
      record.attempts += 1;
      await this.cache.set(key, record, record.expiresAt - Date.now());
      throw unauthorized('Invalid OTP.');
    }
    await this.cache.delete(key);
    await this.cache.set(this.verifiedKey(mobileNumber), true, this.ttlMilliseconds);
  }

  async consumeVerifiedRegistration(mobileNumber: string): Promise<void> {
    const key = this.verifiedKey(mobileNumber);
    if (!(await this.cache.get(key))) throw unauthorized('Verify a valid OTP before patient registration.');
    await this.cache.delete(key);
  }

  private otpKey(mobile: string) { return `auth:otp:${mobile}`; }
  private cooldownKey(mobile: string) { return `auth:otp:cooldown:${mobile}`; }
  private verifiedKey(mobile: string) { return `auth:otp:verified:${mobile}`; }
}
