-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alternateEmail" TEXT,
ALTER COLUMN "email" DROP NOT NULL;
