-- Add universal/custom style support for email templates

ALTER TABLE "EmailTemplate"
ADD COLUMN "styleMode" TEXT NOT NULL DEFAULT 'UNIVERSAL',
ADD COLUMN "customStyleJson" TEXT;

CREATE TABLE "EmailStylePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "styleJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailStylePreset_pkey" PRIMARY KEY ("id")
);
