-- AlterTable
ALTER TABLE "Event" ADD COLUMN "requiredFormTemplateId" TEXT REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Event_requiredFormTemplateId_idx" ON "Event"("requiredFormTemplateId");
