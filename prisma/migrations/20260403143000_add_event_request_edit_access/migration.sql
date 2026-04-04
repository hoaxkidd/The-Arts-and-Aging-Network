-- Add admin-granted edit access fields for rejected event requests
ALTER TABLE "EventRequest"
ADD COLUMN IF NOT EXISTS "editAccessGranted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "editAccessGrantedBy" TEXT,
ADD COLUMN IF NOT EXISTS "editAccessGrantedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "editAccessNote" TEXT;
