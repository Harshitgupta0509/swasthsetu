export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

export interface OtpDelivery {
  accepted: boolean;
  /** Present only in DEVELOPMENT mode. Never expose this in production. */
  demoOtp?: string;
}

export interface OtpProvider {
  sendOtp(mobileNumber: string, otp: string): Promise<OtpDelivery>;
}
