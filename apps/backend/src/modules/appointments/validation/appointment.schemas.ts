import { AppointmentPriority } from '@prisma/client';
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  department: z.string().trim().min(1),
  scheduledAt: z.string().trim().min(1),
  chiefComplaint: z.string().trim().min(1),
  priority: z.nativeEnum(AppointmentPriority).optional(),
}).strict();

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
