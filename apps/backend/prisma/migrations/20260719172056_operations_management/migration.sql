-- CreateEnum
CREATE TYPE "LabReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'REVIEWED');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "LabReportStatus" NOT NULL DEFAULT 'PENDING',
    "uploadDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodStock" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "criticalThreshold" INTEGER NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloodStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "patientName" TEXT,
    "assignedDoctor" TEXT,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "admissionDate" TIMESTAMP(3),
    "remarks" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabReport_hospitalId_status_idx" ON "LabReport"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "LabReport_patientId_createdAt_idx" ON "LabReport"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BloodStock_hospitalId_bloodGroup_key" ON "BloodStock"("hospitalId", "bloodGroup");

-- CreateIndex
CREATE INDEX "Bed_hospitalId_status_idx" ON "Bed"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_hospitalId_bedNumber_key" ON "Bed"("hospitalId", "bedNumber");

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
