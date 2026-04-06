-- Add MessageGroupForm for group-form attachments
CREATE TABLE IF NOT EXISTS "MessageGroupForm" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "formTemplateId" TEXT NOT NULL,
  "minFacilitatorsRequired" INTEGER NOT NULL DEFAULT 1,
  "autoFinalApproveWhenMinMet" BOOLEAN NOT NULL DEFAULT false,
  "rsvpDeadlineHours" INTEGER NOT NULL DEFAULT 48,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessageGroupForm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageGroupForm_groupId_formTemplateId_key" ON "MessageGroupForm"("groupId", "formTemplateId");
CREATE INDEX IF NOT EXISTS "MessageGroupForm_groupId_idx" ON "MessageGroupForm"("groupId");
CREATE INDEX IF NOT EXISTS "MessageGroupForm_formTemplateId_idx" ON "MessageGroupForm"("formTemplateId");

DO $$ BEGIN
  ALTER TABLE "MessageGroupForm" ADD CONSTRAINT "MessageGroupForm_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "MessageGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "MessageGroupForm" ADD CONSTRAINT "MessageGroupForm_formTemplateId_fkey"
  FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
