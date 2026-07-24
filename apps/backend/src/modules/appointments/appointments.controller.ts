import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AppointmentPriority } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser, AppointmentsService } from './appointments.service';
import { Req } from '@nestjs/common';

@Controller({ path: 'appointments', version: '1' })
@UseGuards(JwtGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Get() list(@Req() request: { user: CurrentUser }) { return this.appointments.list(request.user); }
  @Get('queue') queue(@Req() request: { user: CurrentUser }) { return this.appointments.queue(request.user); }
  @Get('overview') overview(@Req() request: { user: CurrentUser }) { return this.appointments.overview(request.user); }
  @Get('patients') patients(@Req() request: { user: CurrentUser }) { return this.appointments.patients(request.user); }
  @Get('doctors') doctors(@Req() request: { user: CurrentUser }) { return this.appointments.doctors(request.user); }
  @Get('notifications') notifications(@Req() request: { user: CurrentUser }) { return this.appointments.notifications(request.user); }
  @Post() create(@Req() request: { user: CurrentUser }, @Body() body: { patientId: string; doctorId: string; department: string; scheduledAt: string; chiefComplaint: string; priority?: AppointmentPriority }) { return this.appointments.create(request.user, body); }
  @Post(':id/start') start(@Req() request: { user: CurrentUser }, @Param('id') id: string) { return this.appointments.start(request.user, id); }
  @Post(':id/complete') complete(@Req() request: { user: CurrentUser }, @Param('id') id: string) { return this.appointments.complete(request.user, id); }
}