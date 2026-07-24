export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export type AuthRole =
  | 'PATIENT'
  | 'DOCTOR'
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'RECEPTION'
  | 'LAB_STAFF'
  | 'BLOOD_BANK_STAFF'
  | 'BED_MANAGER'
  | 'ACCOUNTS'
  | 'VIEWER';

export interface AuthUser {
  id: string;
  hospitalId?: string;
  role: AuthRole;
  mobileNumber?: string;
  employeeId?: string;
  doctorId?: string;
  passwordHash?: string;
  refreshTokenHash?: string | null;
  temporaryPassword?: boolean;
  fullName: string;
}

export interface CreatePatientInput {
  mobileNumber: string;
  fullName: string;
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  address: string;
  bloodGroup?: string;
  emergencyContact: string;
}

export interface AuthUserRepository {
  findPatientByMobile(mobileNumber: string): Promise<AuthUser | null>;
  findStaffByEmployeeId(employeeId: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  createPatient(input: CreatePatientInput): Promise<AuthUser>;
  setRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void>;
}
