import { z } from 'zod';

const indianMobile = z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number.');

export const sendOtpSchema = z.object({ mobileNumber: indianMobile }).strict();
export const verifyOtpSchema = z.object({ mobileNumber: indianMobile, otp: z.string().regex(/^\d{6}$/) }).strict();
export const loginSchema = z.object({ employeeId: z.string().trim().min(1), password: z.string().min(8) }).strict();
export const registerPatientSchema = z.object({
  mobileNumber: indianMobile,
  fullName: z.string().trim().min(1),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  address: z.string().trim().min(1),
  bloodGroup: z.string().trim().min(1).optional(),
  emergencyContact: indianMobile,
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
