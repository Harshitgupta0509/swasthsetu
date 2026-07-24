import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { BedStatus, LabReportStatus } from '@prisma/client';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../appointments/appointments.service';
import { OperationsService } from './operations.service';

@Controller({ path:'operations', version:'1' })
@UseGuards(JwtGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Get('lab-reports') reports(@Req() r:{user:CurrentUser}) { return this.operations.labReports(r.user); }
  @Patch('lab-reports/:id') updateReport(@Req() r:{user:CurrentUser},@Param('id') id:string,@Body() body:{status?:LabReportStatus;remarks?:string}) { return this.operations.updateLab(r.user,id,body); }
  @Get('blood-stocks') blood(@Req() r:{user:CurrentUser}) { return this.operations.blood(r.user); }
  @Patch('blood-stocks/:id') updateBlood(@Req() r:{user:CurrentUser},@Param('id') id:string,@Body() body:{units:number}) { return this.operations.updateBlood(r.user,id,body); }
  @Get('beds') beds(@Req() r:{user:CurrentUser}) { return this.operations.beds(r.user); }
  @Patch('beds/:id') updateBed(@Req() r:{user:CurrentUser},@Param('id') id:string,@Body() body:{status?:BedStatus;patientName?:string;assignedDoctor?:string;remarks?:string}) { return this.operations.updateBed(r.user,id,body); }
}