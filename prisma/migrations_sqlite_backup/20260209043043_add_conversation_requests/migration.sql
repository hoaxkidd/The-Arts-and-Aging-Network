-- AlterTable
ALTER TABLE "ExpenseRequest" ADD COLUMN "attachments" TEXT;

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "expiryDate" DATETIME,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "GeriatricHome" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "folders" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "type" TEXT NOT NULL DEFAULT 'OFFICE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "activities" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeriatricHome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "residentCount" INTEGER NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "specialNeeds" TEXT,
    "emergencyProtocol" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactPosition" TEXT,
    "additionalContacts" TEXT,
    "type" TEXT,
    "region" TEXT,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "newsletterSub" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME,
    "flags" TEXT,
    "secondaryContact" TEXT,
    "accessibilityInfo" TEXT,
    "triggerWarnings" TEXT,
    "accommodations" TEXT,
    "photoPermissions" TEXT,
    "feedbackFormUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeriatricHome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "commentId" TEXT,
    "photoId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "EventComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventReaction_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "EventPhoto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "geriatricHomeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "existingEventId" TEXT,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "customStartDateTime" DATETIME,
    "customEndDateTime" DATETIME,
    "customLocationName" TEXT,
    "customLocationAddress" TEXT,
    "preferredDates" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "rejectionReason" TEXT,
    "selectedDateIndex" INTEGER,
    "approvedEventId" TEXT,
    "notes" TEXT,
    "expectedAttendees" INTEGER,
    "programType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventRequest_geriatricHomeId_fkey" FOREIGN KEY ("geriatricHomeId") REFERENCES "GeriatricHome" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventRequest_existingEventId_fkey" FOREIGN KEY ("existingEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EventRequest_approvedEventId_fkey" FOREIGN KEY ("approvedEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventRequestResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "notes" TEXT,
    "respondedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRequestResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "EventRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRequestResponse_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DirectMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DirectMessageRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "requestedId" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DirectMessageRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DirectMessageRequest_requestedId_fkey" FOREIGN KEY ("requestedId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhoneRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "requestedId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PhoneRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PhoneRequest_requestedId_fkey" FOREIGN KEY ("requestedId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requesterId" TEXT NOT NULL,
    "requestedId" TEXT NOT NULL,
    "proposedTimes" TEXT NOT NULL,
    "selectedTime" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeetingRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MeetingRequest_requestedId_fkey" FOREIGN KEY ("requestedId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Timesheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timesheetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "eventId" TEXT,
    "programId" TEXT,
    "programName" TEXT,
    "checkInTime" DATETIME,
    "checkOutTime" DATETIME,
    "hoursWorked" REAL NOT NULL DEFAULT 0,
    "fundingClass" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimesheetEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimesheetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MileageEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "startLocation" TEXT NOT NULL,
    "endLocation" TEXT NOT NULL,
    "kilometers" REAL NOT NULL,
    "fundingClass" TEXT,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MileageEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT,
    "reminderType" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "mailchimpCampaignId" TEXT,
    "mailchimpStatus" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "isFillable" BOOLEAN NOT NULL DEFAULT false,
    "formFields" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "tags" TEXT,
    "requiredFor" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormTemplate_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "formData" TEXT NOT NULL,
    "attachments" TEXT,
    "eventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormSubmission_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FormSubmission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FormSubmission_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "authorImage" TEXT,
    "organizationName" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "eventId" TEXT,
    "programType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "videoUrl" TEXT,
    "collectedBy" TEXT,
    "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Testimonial_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Testimonial_collectedBy_fkey" FOREIGN KEY ("collectedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "cost" REAL,
    "price" REAL,
    "isForSale" BOOLEAN NOT NULL DEFAULT false,
    "size" TEXT,
    "color" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT,
    "location" TEXT,
    "supplier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "eventId" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "iconEmoji" TEXT NOT NULL DEFAULT '💬',
    "color" TEXT NOT NULL DEFAULT 'blue',
    "eventId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowAllStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MessageGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MessageGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt" DATETIME,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MessageGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MessageGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'SUPPORTER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "totalDonated" REAL NOT NULL DEFAULT 0,
    "donationCount" INTEGER NOT NULL DEFAULT 0,
    "firstDonation" DATETIME,
    "lastDonation" DATETIME,
    "newsletter" BOOLEAN NOT NULL DEFAULT true,
    "taxReceipts" BOOLEAN NOT NULL DEFAULT true,
    "publicRecognition" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "tags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "donorId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "type" TEXT NOT NULL DEFAULT 'MONETARY',
    "method" TEXT,
    "campaign" TEXT,
    "programType" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "restrictions" TEXT,
    "receiptNumber" TEXT,
    "receiptIssued" BOOLEAN NOT NULL DEFAULT false,
    "receiptDate" DATETIME,
    "thankYouSent" BOOLEAN NOT NULL DEFAULT false,
    "thankYouDate" DATETIME,
    "notes" TEXT,
    "donationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Donation_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME NOT NULL,
    "locationId" TEXT NOT NULL,
    "organizerName" TEXT,
    "organizerRole" TEXT,
    "organizerEmail" TEXT,
    "organizerPhone" TEXT,
    "maxAttendees" INTEGER NOT NULL DEFAULT 20,
    "autoAcceptLimit" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "origin" TEXT NOT NULL DEFAULT 'ADMIN',
    "geriatricHomeId" TEXT,
    "programId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_geriatricHomeId_fkey" FOREIGN KEY ("geriatricHomeId") REFERENCES "GeriatricHome" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("autoAcceptLimit", "createdAt", "description", "endDateTime", "id", "locationId", "maxAttendees", "startDateTime", "status", "title", "updatedAt") SELECT "autoAcceptLimit", "createdAt", "description", "endDateTime", "id", "locationId", "maxAttendees", "startDateTime", "status", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE TABLE "new_EventComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventComment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EventComment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventComment" ("content", "createdAt", "eventId", "id", "updatedAt", "userId") SELECT "content", "createdAt", "eventId", "id", "updatedAt", "userId" FROM "EventComment";
DROP TABLE "EventComment";
ALTER TABLE "new_EventComment" RENAME TO "EventComment";
CREATE INDEX "EventComment_eventId_parentId_idx" ON "EventComment"("eventId", "parentId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VOLUNTEER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "bio" TEXT,
    "roleData" TEXT,
    "notificationPreferences" TEXT,
    "pronouns" TEXT,
    "preferredName" TEXT,
    "birthDate" DATETIME,
    "address" TEXT,
    "emergencyContact" TEXT,
    "healthInfo" TEXT,
    "sinHash" TEXT,
    "directDeposit" BOOLEAN NOT NULL DEFAULT false,
    "intakeAnswers" TEXT,
    "employmentStatus" TEXT,
    "startDate" DATETIME,
    "supervisorId" TEXT,
    "region" TEXT,
    "employmentType" TEXT,
    "position" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("bio", "createdAt", "email", "id", "image", "name", "password", "phone", "role", "roleData", "status", "updatedAt") SELECT "bio", "createdAt", "email", "id", "image", "name", "password", "phone", "role", "roleData", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GeriatricHome_userId_key" ON "GeriatricHome"("userId");

-- CreateIndex
CREATE INDEX "EventReaction_commentId_idx" ON "EventReaction"("commentId");

-- CreateIndex
CREATE INDEX "EventReaction_photoId_idx" ON "EventReaction"("photoId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReaction_userId_commentId_key" ON "EventReaction"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReaction_userId_photoId_key" ON "EventReaction"("userId", "photoId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "EventRequest_approvedEventId_key" ON "EventRequest"("approvedEventId");

-- CreateIndex
CREATE INDEX "EventRequest_geriatricHomeId_status_idx" ON "EventRequest"("geriatricHomeId", "status");

-- CreateIndex
CREATE INDEX "EventRequest_status_requestedAt_idx" ON "EventRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "EventRequestResponse_requestId_idx" ON "EventRequestResponse"("requestId");

-- CreateIndex
CREATE INDEX "EventRequestResponse_staffId_idx" ON "EventRequestResponse"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRequestResponse_requestId_staffId_key" ON "EventRequestResponse"("requestId", "staffId");

-- CreateIndex
CREATE INDEX "DirectMessage_recipientId_read_idx" ON "DirectMessage"("recipientId", "read");

-- CreateIndex
CREATE INDEX "DirectMessageRequest_status_idx" ON "DirectMessageRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DirectMessageRequest_requesterId_requestedId_key" ON "DirectMessageRequest"("requesterId", "requestedId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneRequest_requesterId_requestedId_key" ON "PhoneRequest"("requesterId", "requestedId");

-- CreateIndex
CREATE INDEX "Timesheet_status_weekStart_idx" ON "Timesheet"("status", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_userId_weekStart_key" ON "Timesheet"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "TimesheetEntry_timesheetId_date_idx" ON "TimesheetEntry"("timesheetId", "date");

-- CreateIndex
CREATE INDEX "MileageEntry_userId_year_month_idx" ON "MileageEntry"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "EmailReminder_eventId_recipientType_reminderType_idx" ON "EmailReminder"("eventId", "recipientType", "reminderType");

-- CreateIndex
CREATE INDEX "EmailReminder_status_scheduledFor_idx" ON "EmailReminder"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "EmailReminder_eventId_recipientType_recipientId_reminderType_key" ON "EmailReminder"("eventId", "recipientType", "recipientId", "reminderType");

-- CreateIndex
CREATE INDEX "FormTemplate_category_isActive_idx" ON "FormTemplate"("category", "isActive");

-- CreateIndex
CREATE INDEX "FormTemplate_isActive_createdAt_idx" ON "FormTemplate"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_templateId_submittedBy_idx" ON "FormSubmission"("templateId", "submittedBy");

-- CreateIndex
CREATE INDEX "FormSubmission_status_createdAt_idx" ON "FormSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FormSubmission_eventId_idx" ON "FormSubmission"("eventId");

-- CreateIndex
CREATE INDEX "Testimonial_status_featured_idx" ON "Testimonial"("status", "featured");

-- CreateIndex
CREATE INDEX "Testimonial_eventId_idx" ON "Testimonial"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_category_isActive_idx" ON "InventoryItem"("category", "isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_quantity_idx" ON "InventoryItem"("quantity");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_createdAt_idx" ON "InventoryTransaction"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransaction_type_createdAt_idx" ON "InventoryTransaction"("type", "createdAt");

-- CreateIndex
CREATE INDEX "MessageGroup_isActive_createdAt_idx" ON "MessageGroup"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "MessageGroup_eventId_idx" ON "MessageGroup"("eventId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_isActive_idx" ON "GroupMember"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "GroupMessage"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupMessage_senderId_idx" ON "GroupMessage"("senderId");

-- CreateIndex
CREATE INDEX "Donor_type_status_idx" ON "Donor"("type", "status");

-- CreateIndex
CREATE INDEX "Donor_tier_idx" ON "Donor"("tier");

-- CreateIndex
CREATE INDEX "Donor_email_idx" ON "Donor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_receiptNumber_key" ON "Donation"("receiptNumber");

-- CreateIndex
CREATE INDEX "Donation_donorId_donationDate_idx" ON "Donation"("donorId", "donationDate");

-- CreateIndex
CREATE INDEX "Donation_donationDate_idx" ON "Donation"("donationDate");

-- CreateIndex
CREATE INDEX "Donation_campaign_idx" ON "Donation"("campaign");
