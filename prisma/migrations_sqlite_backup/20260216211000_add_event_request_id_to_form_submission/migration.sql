-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN "eventRequestId" TEXT REFERENCES "EventRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "FormSubmission_eventRequestId_key" ON "FormSubmission"("eventRequestId");

-- CreateIndex
CREATE INDEX "FormSubmission_eventRequestId_idx" ON "FormSubmission"("eventRequestId");
