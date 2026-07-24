import { Injectable } from '@nestjs/common';
import { Gender, Role, User } from '@prisma/client';
import { AuthUser, AuthUserRepository, CreatePatientInput } from '../modules/auth/interfaces/auth-user-repository.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaAuthUserRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findPatientByMobile(mobileNumber: string) { return this.map(await this.prisma.user.findFirst({ where: { mobileNumber, role: Role.PATIENT } })); }
  async findStaffByEmployeeId(employeeId: string) { return this.map(await this.prisma.user.findFirst({ where: { OR: [{ employeeId }, { doctorId: employeeId }], role: { not: Role.PATIENT } } })); }
  async findById(id: string) { return this.map(await this.prisma.user.findUnique({ where: { id } })); }
  async createPatient(input: CreatePatientInput) { return this.map(await this.prisma.user.create({ data: { ...input, role: Role.PATIENT, gender: input.gender as Gender } }))!; }
  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null) { await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } }); }
  private map(user: User | null): AuthUser | null { return user ? { id: user.id, hospitalId: user.hospitalId ?? undefined, role: user.role, mobileNumber: user.mobileNumber ?? undefined, employeeId: user.employeeId ?? undefined, doctorId: user.doctorId ?? undefined, passwordHash: user.passwordHash ?? undefined, refreshTokenHash: user.refreshTokenHash, temporaryPassword: user.temporaryPassword, fullName: user.fullName } : null; }
}
