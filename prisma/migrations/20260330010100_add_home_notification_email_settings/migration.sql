-- Add home-level notification routing fields
ALTER TABLE "GeriatricHome"
ADD COLUMN IF NOT EXISTS "useCustomNotificationEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "notificationEmail" TEXT;
