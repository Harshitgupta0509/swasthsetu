import { AppointmentPriority, AppointmentStatus, Gender, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const hospitalId = 'safdarjung';

async function main() {
  const passwordHash = await argon2.hash('ChangeMe123!');
  const doctors = await Promise.all([
    prisma.user.upsert({ where: { doctorId: 'DR-1001' }, update: { fullName: 'Dr. Rahul Sharma', role: Role.DOCTOR, hospitalId, passwordHash }, create: { doctorId: 'DR-1001', employeeId: 'DR-1001', fullName: 'Dr. Rahul Sharma', role: Role.DOCTOR, hospitalId, passwordHash } }),
    prisma.user.upsert({ where: { doctorId: 'DR-1002' }, update: {}, create: { doctorId: 'DR-1002', employeeId: 'DR-1002', fullName: 'Dr. Ananya Singh', role: Role.DOCTOR, hospitalId, passwordHash } }),
    prisma.user.upsert({ where: { doctorId: 'DR-1003' }, update: {}, create: { doctorId: 'DR-1003', employeeId: 'DR-1003', fullName: 'Dr. Vivek Mehta', role: Role.DOCTOR, hospitalId, passwordHash } }),
  ]);
  await prisma.user.upsert({ where: { employeeId: 'HA-1001' }, update: { passwordHash }, create: { employeeId: 'HA-1001', fullName: 'Hospital Admin', role: Role.HOSPITAL_ADMIN, hospitalId, passwordHash } });

  const patientData = [
    ['Riya Kumar','9000000001',Gender.FEMALE,'1994-05-10','A+'], ['Arun Sharma','9000000002',Gender.MALE,'1968-03-04','B+'], ['Meera Singh','9000000003',Gender.FEMALE,'1991-09-18','O+'], ['Fatima Khan','9000000004',Gender.FEMALE,'1985-11-21','AB+'], ['Vikram Gupta','9000000005',Gender.MALE,'1978-06-17','O-'], ['Nisha Verma','9000000006',Gender.FEMALE,'1995-02-12','A-'], ['Sanjay Patel','9000000007',Gender.MALE,'1981-01-08','B-'], ['Kavita Joshi','9000000008',Gender.FEMALE,'1972-07-30','A+'],
  ] as const;
  const patients = [];
  for (const [fullName, mobileNumber, gender, dob, bloodGroup] of patientData) {
    patients.push(await prisma.user.upsert({ where: { mobileNumber }, update: { fullName }, create: { fullName, mobileNumber, role: Role.PATIENT, gender, dateOfBirth: new Date(dob), bloodGroup, hospitalId, emergencyContact: '9000000099' } }));
  }
  const day = new Date(); day.setHours(0,0,0,0);
  const at = (hours: number, minutes: number) => { const value = new Date(day); value.setHours(hours, minutes, 0, 0); return value; };
  const rows = [
    [patients[5], doctors[0], 42, 'General Medicine', 9, 45, AppointmentStatus.IN_CONSULTATION, AppointmentPriority.NORMAL, 'Fever and cough'],
    [patients[0], doctors[0], 43, 'General Medicine', 10, 30, AppointmentStatus.WAITING, AppointmentPriority.NORMAL, 'Seasonal fever and body ache'],
    [patients[1], doctors[0], 44, 'General Medicine', 10, 45, AppointmentStatus.WAITING, AppointmentPriority.HIGH, 'Chest discomfort'],
    [patients[2], doctors[0], 45, 'General Medicine', 11, 0, AppointmentStatus.WAITING, AppointmentPriority.NORMAL, 'Persistent headache'],
    [patients[3], doctors[1], 46, 'General Medicine', 11, 15, AppointmentStatus.CONFIRMED, AppointmentPriority.NORMAL, 'Follow-up consultation'],
    [patients[4], doctors[2], 47, 'Cardiology', 11, 30, AppointmentStatus.CONFIRMED, AppointmentPriority.NORMAL, 'Blood pressure review'],
    [patients[6], doctors[0], 41, 'General Medicine', 9, 30, AppointmentStatus.COMPLETED, AppointmentPriority.NORMAL, 'Diabetes follow-up'],
    [patients[7], doctors[1], 40, 'General Medicine', 9, 15, AppointmentStatus.COMPLETED, AppointmentPriority.NORMAL, 'Routine consultation'],
  ] as const;
  for (const [patient, doctor, tokenNumber, department, hour, minute, status, priority, chiefComplaint] of rows) {
    const scheduledAt = at(hour, minute);
    const appointment = await prisma.appointment.upsert({ where: { hospitalId_scheduledAt_tokenNumber: { hospitalId, scheduledAt, tokenNumber } }, update: { patientId: patient.id, doctorId: doctor.id, department, status, priority, chiefComplaint }, create: { hospitalId, patientId: patient.id, doctorId: doctor.id, tokenNumber, department, scheduledAt, status, priority, chiefComplaint, consultationStartedAt: status === AppointmentStatus.IN_CONSULTATION ? new Date() : null } });
    if (patient.mobileNumber === '9000000001') await prisma.notification.upsert({ where: { id: 'demo-riya-appointment' }, update: {}, create: { id: 'demo-riya-appointment', userId: patient.id, appointmentId: appointment.id, type: 'APPOINTMENT_REMINDER', title: 'Appointment reminder', message: 'Your General Medicine appointment is scheduled today at 10:30 AM.' } });
  }
  const labRows = [
    [patients[0].id, 'Complete blood count', 'Dr. Rahul Sharma', 'READY'],
    [patients[1].id, 'Lipid profile', 'Dr. Vivek Mehta', 'PROCESSING'],
    [patients[2].id, 'Thyroid profile', 'Dr. Rahul Sharma', 'PENDING'],
  ] as const;
  for (const [patientId, testName, requestedBy, status] of labRows) {
    await prisma.labReport.upsert({ where: { id: `demo-${testName.replaceAll(' ','-').toLowerCase()}-${patientId}` }, update: { status }, create: { id: `demo-${testName.replaceAll(' ','-').toLowerCase()}-${patientId}`, hospitalId, patientId, testName, requestedBy, status, uploadDate: status === 'READY' ? new Date() : null } });
  }
  for (const [bloodGroup, units, criticalThreshold] of [['A+',68,20],['O+',72,25],['B-',3,8],['AB-',7,10]] as const) {
    await prisma.bloodStock.upsert({ where: { hospitalId_bloodGroup: { hospitalId, bloodGroup } }, update: { units, criticalThreshold, updatedBy: 'Seed' }, create: { hospitalId, bloodGroup, units, criticalThreshold, updatedBy: 'Seed' } });
  }
  for (const [bedNumber, ward, department, patientName, assignedDoctor, status] of [['G-102','General Ward A','General Medicine','Arun Sharma','Dr. Rahul Sharma','OCCUPIED'],['ICU-04','ICU West','Critical Care','Fatima Khan','Dr. Vivek Mehta','OCCUPIED'],['E-13','Emergency','Emergency',null,null,'AVAILABLE'],['G-103','General Ward A','General Medicine',null,null,'AVAILABLE']] as const) {
    await prisma.bed.upsert({ where: { hospitalId_bedNumber: { hospitalId, bedNumber } }, update: { ward, department, patientName, assignedDoctor, status }, create: { hospitalId, bedNumber, ward, department, patientName, assignedDoctor, status } });
  }
  console.log('Demo users, appointments and operations data seeded.');
}
main().finally(() => prisma.$disconnect());