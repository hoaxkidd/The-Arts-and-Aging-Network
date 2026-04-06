-- Add facilitator RSVP workflow fields to EventRequest
ALTER TABLE "EventRequest"
ADD COLUMN IF NOT EXISTS "workflowStage" TEXT DEFAULT 'PENDING_INITIAL_ADMIN_APPROVAL',
ADD COLUMN IF NOT EXISTS "requiredGroupIds" TEXT,
ADD COLUMN IF NOT EXISTS "requiredPersonIds" TEXT,
ADD COLUMN IF NOT EXISTS "minFacilitatorsRequired" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "autoFinalApproveWhenMinMet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "rsvpOpenedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rsvpDeadlineAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "facilitatorThresholdMetAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rsvpClosedById" TEXT,
ADD COLUMN IF NOT EXISTS "rsvpClosedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rsvpClosedReason" TEXT;

-- Add facilitator targeting defaults to FormTemplate
ALTER TABLE "FormTemplate"
ADD COLUMN IF NOT EXISTS "requiredGroupIds" TEXT,
ADD COLUMN IF NOT EXISTS "requiredPersonIds" TEXT,
ADD COLUMN IF NOT EXISTS "minFacilitatorsRequired" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "autoFinalApproveWhenMinMet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "facilitatorRsvpDeadlineHours" INTEGER DEFAULT 48;

-- Add Communication Hub form-attachment flag to MessageGroup
ALTER TABLE "MessageGroup"
ADD COLUMN IF NOT EXISTS "isAttachableToForms" BOOLEAN NOT NULL DEFAULT false;

-- Facilitator RSVP responses per request
CREATE TABLE IF NOT EXISTS "EventRequestFacilitatorRsvp" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceGroupId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventRequestFacilitatorRsvp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventRequestFacilitatorRsvp_requestId_userId_key" ON "EventRequestFacilitatorRsvp"("requestId", "userId");
CREATE INDEX IF NOT EXISTS "EventRequestFacilitatorRsvp_requestId_status_idx" ON "EventRequestFacilitatorRsvp"("requestId", "status");
CREATE INDEX IF NOT EXISTS "EventRequestFacilitatorRsvp_userId_status_idx" ON "EventRequestFacilitatorRsvp"("userId", "status");
CREATE INDEX IF NOT EXISTS "EventRequest_workflowStage_rsvpDeadlineAt_idx" ON "EventRequest"("workflowStage", "rsvpDeadlineAt");

DO $$ BEGIN
  ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_rsvpClosedById_fkey"
  FOREIGN KEY ("rsvpClosedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventRequestFacilitatorRsvp" ADD CONSTRAINT "EventRequestFacilitatorRsvp_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "EventRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventRequestFacilitatorRsvp" ADD CONSTRAINT "EventRequestFacilitatorRsvp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
