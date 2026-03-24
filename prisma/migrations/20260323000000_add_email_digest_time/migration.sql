-- Add emailDigestTime field for customizable digest scheduling
ALTER TABLE "User" ADD COLUMN "emailDigestTime" TEXT DEFAULT '08:00';
