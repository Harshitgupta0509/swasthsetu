import { BedStatus, LabReportStatus } from '@prisma/client';
import { z } from 'zod';

export const updateLabSchema = z.object({
  status: z.nativeEnum(LabReportStatus).optional(),
  remarks: z.string().optional(),
}).strict().refine(value => value.status !== undefined || value.remarks !== undefined, 'Provide at least one field.');

export const updateBloodSchema = z.object({ units: z.coerce.number().int().nonnegative() }).strict();

export const updateBedSchema = z.object({
  status: z.nativeEnum(BedStatus).optional(),
  patientName: z.string().optional(),
  assignedDoctor: z.string().optional(),
  remarks: z.string().optional(),
}).strict().refine(value => Object.values(value).some(item => item !== undefined), 'Provide at least one field.');
