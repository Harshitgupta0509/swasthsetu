import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentPriority, AppointmentStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthRole } from '../auth/interfaces/auth-user-repository.interface';

export type CurrentUser = { sub: string; role: AuthRole; hospitalId?: string };
const includePeople = { patient: { select: { id: true, fullName: true, mobileNumber: true, dateOfBirth: true, gender: true, bloodGroup: true } }, doctor: { select: { id: true, fullName: true, doctorId: true } } } as const;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser) {
    const where = user.role === 'PATIENT' ? { patientId: user.sub } : user.role === 'DOCTOR' ? { doctorId: user.sub } : { hospitalId: user.hospitalId ?? 'safdarjung' };
    const appointments = await this.prisma.appointment.findMany({ where, include: includePeople, orderBy: [{ scheduledAt: 'asc' }, { tokenNumber: 'asc' }] });
    return appointments.map(item => this.serialize(item));
  }

  async queue(user: CurrentUser) {
    const hospitalId = user.hospitalId ?? 'safdarjung';
    const scope = user.role === 'PATIENT' ? { patientId: user.sub } : user.role === 'DOCTOR' ? { doctorId: user.sub } : {};
    const appointments = await this.prisma.appointment.findMany({ where: { hospitalId, status: { in: [AppointmentStatus.WAITING, AppointmentStatus.IN_CONSULTATION] }, ...scope }, include: includePeople, orderBy: { tokenNumber: 'asc' } });
    return appointments.map(item => this.serialize(item));
  }

  async overview(user: CurrentUser) {
    const appointments = await this.list(user);
    const queue = await this.queue(user);
    const completed = appointments.filter(item => item.status === 'COMPLETED').length;
    const waiting = queue.filter(item => item.status === 'WAITING').length;
    return { appointments, queue, stats: { total: appointments.length, completed, waiting, inConsultation: queue.filter(item => item.status === 'IN_CONSULTATION').length } };
  }

  async create(user: CurrentUser, input: { patientId: string; doctorId: string; department: string; scheduledAt: string; chiefComplaint: string; priority?: AppointmentPriority }) {
    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTION'].includes(user.role)) throw new ForbiddenException('You do not have permission to create appointments.');
    const hospitalId = user.hospitalId ?? 'safdarjung';
    const patient = await this.prisma.user.findFirst({ where: { id: input.patientId, role: Role.PATIENT } });
    const doctor = await this.prisma.user.findFirst({ where: { id: input.doctorId, role: Role.DOCTOR, hospitalId } });
    if (!patient || !doctor) throw new BadRequestException('Select a valid patient and doctor.');
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Enter a valid appointment time.');
    const last = await this.prisma.appointment.aggregate({ where: { hospitalId, scheduledAt }, _max: { tokenNumber: true } });
    const appointment = await this.prisma.appointment.create({ data: { hospitalId, patientId: patient.id, doctorId: doctor.id, department: input.department, scheduledAt, chiefComplaint: input.chiefComplaint, priority: input.priority ?? AppointmentPriority.NORMAL, tokenNumber: (last._max.tokenNumber ?? 40) + 1, status: AppointmentStatus.WAITING }, include: includePeople });
    await this.notify(appointment.patientId, appointment.id, 'APPOINTMENT_CREATED', 'Appointment confirmed', `Your token ${appointment.tokenNumber} is confirmed for ${appointment.department}.`);
    return this.serialize(appointment);
  }

  async start(user: CurrentUser, id: string) { return this.transition(user, id, AppointmentStatus.IN_CONSULTATION); }
  async complete(user: CurrentUser, id: string) { return this.transition(user, id, AppointmentStatus.COMPLETED); }

  private async transition(user: CurrentUser, id: string, status: AppointmentStatus) {
    const appointment = await this.prisma.appointment.findUnique({ where: { id }, include: includePeople });
    if (!appointment) throw new NotFoundException('Appointment not found.');
    if (user.role === 'DOCTOR' && appointment.doctorId !== user.sub) throw new ForbiddenException('This patient is not assigned to you.');
    if (!['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(user.role)) throw new ForbiddenException('You do not have permission to update this appointment.');
    const updated = await this.prisma.appointment.update({ where: { id }, data: { status, consultationStartedAt: status === AppointmentStatus.IN_CONSULTATION ? new Date() : appointment.consultationStartedAt, consultationEndedAt: status === AppointmentStatus.COMPLETED ? new Date() : null }, include: includePeople });
    const title = status === AppointmentStatus.IN_CONSULTATION ? 'Your consultation has started' : 'Consultation completed';
    const message = status === AppointmentStatus.IN_CONSULTATION ? `Please proceed to the consultation room for token ${updated.tokenNumber}.` : 'Your consultation is complete. Your prescription will be available in the portal.';
    await this.notify(updated.patientId, updated.id, status === AppointmentStatus.IN_CONSULTATION ? 'QUEUE_UPDATE' : 'CONSULTATION_COMPLETED', title, message);
    return this.serialize(updated);
  }

  async patients(user: CurrentUser) {
    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTION', 'DOCTOR'].includes(user.role)) throw new ForbiddenException();
    return this.prisma.user.findMany({ where: { role: Role.PATIENT }, select: { id: true, fullName: true, mobileNumber: true, dateOfBirth: true, gender: true }, take: 50, orderBy: { fullName: 'asc' } });
  }
  async doctors(user: CurrentUser) {
    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTION'].includes(user.role)) throw new ForbiddenException();
    return this.prisma.user.findMany({ where: { role: Role.DOCTOR, hospitalId: user.hospitalId ?? 'safdarjung' }, select: { id: true, fullName: true, doctorId: true }, orderBy: { fullName: 'asc' } });
  }
  async notifications(user: CurrentUser) { return this.prisma.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: 'desc' }, take: 30 }); }

  private async notify(userId: string, appointmentId: string, type: string, title: string, message: string) { await this.prisma.notification.create({ data: { userId, appointmentId, type, title, message } }); }
  private serialize(item: any) { return { id: item.id, tokenNumber: item.tokenNumber, department: item.department, scheduledAt: item.scheduledAt, status: item.status, priority: item.priority, chiefComplaint: item.chiefComplaint, consultationStartedAt: item.consultationStartedAt, patient: item.patient, doctor: item.doctor }; }
}