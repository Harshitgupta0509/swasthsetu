import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BedStatus, LabReportStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../appointments/appointments.service';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}
  private hospital(user: CurrentUser) { return user.hospitalId ?? 'safdarjung'; }
  private admin(user: CurrentUser) { if (!['SUPER_ADMIN','HOSPITAL_ADMIN','LAB_STAFF','BLOOD_BANK_STAFF','BED_MANAGER'].includes(user.role)) throw new ForbiddenException(); }

  async labReports(user: CurrentUser) { const where = user.role === 'PATIENT' ? { patientId: user.sub } : { hospitalId: this.hospital(user) }; return this.prisma.labReport.findMany({ where, include: { patient: { select: { fullName: true, mobileNumber: true } } }, orderBy: { createdAt: 'desc' } }); }
  async updateLab(user: CurrentUser, id: string, body: { status?: LabReportStatus; remarks?: string }) { this.admin(user); const report=await this.prisma.labReport.findFirst({ where:{id,hospitalId:this.hospital(user)} }); if(!report) throw new NotFoundException('Report not found.'); return this.prisma.labReport.update({where:{id},data:{status:body.status,remarks:body.remarks,uploadDate:body.status==='READY'?new Date():report.uploadDate},include:{patient:{select:{fullName:true,mobileNumber:true}}}}); }

  async blood(user: CurrentUser) { return this.prisma.bloodStock.findMany({ where:{hospitalId:this.hospital(user)},orderBy:{bloodGroup:'asc'} }); }
  async updateBlood(user: CurrentUser, id: string, body: { units: number }) { this.admin(user); const stock=await this.prisma.bloodStock.findFirst({where:{id,hospitalId:this.hospital(user)}}); if(!stock) throw new NotFoundException('Blood stock not found.'); return this.prisma.bloodStock.update({where:{id},data:{units:Number(body.units),updatedBy:user.role}}); }

  async beds(user: CurrentUser) { return this.prisma.bed.findMany({where:{hospitalId:this.hospital(user)},orderBy:{bedNumber:'asc'}}); }
  async updateBed(user: CurrentUser, id: string, body: { status?: BedStatus; patientName?: string; assignedDoctor?: string; remarks?: string }) { this.admin(user); const bed=await this.prisma.bed.findFirst({where:{id,hospitalId:this.hospital(user)}}); if(!bed) throw new NotFoundException('Bed not found.'); return this.prisma.bed.update({where:{id},data:{status:body.status,patientName:body.patientName,assignedDoctor:body.assignedDoctor,remarks:body.remarks,admissionDate:body.status==='OCCUPIED'?(bed.admissionDate??new Date()):null}}); }
}