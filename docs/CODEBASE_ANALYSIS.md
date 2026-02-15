# Arts & Aging - Comprehensive Codebase Analysis

## Overview

This document provides a detailed analysis of the Arts & Aging volunteer management system, mapping every requirement from the original software development notes against the current implementation. The app is built with **Next.js 16.1.1**, **Prisma ORM v5.22.0** (SQLite), **NextAuth v5**, and **Tailwind CSS v4**.

**Current Stats:**
- **37** database models
- **34** server action files
- **89** component files
- **65+** app route directories
- **8** user roles: ADMIN, PAYROLL, FACILITATOR, CONTRACTOR, VOLUNTEER, BOARD, HOME_ADMIN, PARTNER

---

## Table of Contents

1. [Features Already Implemented](#1-features-already-implemented)
2. [Features That Need to Be Implemented](#2-features-that-need-to-be-implemented)
3. [Upgrades & Changes Needed](#3-upgrades--changes-needed)
4. [Best Implementation Approach for New Features](#4-best-implementation-approach-for-new-features)
5. [Full Database Model Reference](#5-full-database-model-reference)
6. [File Structure Reference](#6-file-structure-reference)

---

## 1. Features Already Implemented

### 1.1 Staff Login & Check-in System

> **Requirement:** "Need a program/app for staff to log in and check in to the location where the program is happening."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Authentication | `auth.ts` | NextAuth with email/password, role-based sessions |
| Role-based access | `middleware.ts` | Routes protected by role (ADMIN, PAYROLL, STAFF, etc.) |
| Event check-in | `app/actions/attendance.ts` | 2-hour-before-to-event-end check-in window |
| Staff check-in | `app/actions/staff-attendance.ts` | Staff-specific check-in with confirmation requirement |
| RSVP system | `app/actions/attendance.ts` | YES/NO/MAYBE with capacity enforcement via Prisma transaction |
| Check-in UI | `components/payroll/SimpleCheckIn.tsx` | Simple check-in interface |
| Work sessions | `components/payroll/WorkSessionManager.tsx` | Real-time work session tracking |

**What works:**
- Users authenticate with email/password
- Role-based routing sends users to correct dashboard (admin → `/admin`, payroll → `/payroll`, staff → `/staff`, home admin → `/dashboard`)
- Check-in opens 2 hours before event start, closes at event end
- Check-in records timestamp automatically
- Admin receives notification on staff check-in
- Capacity enforcement prevents overbooking

**What's missing:**
- No GPS/location verification at check-in
- No automatic connection between check-in hours and payment/funding accounts
- Check-in doesn't auto-populate timesheet entries

---

### 1.2 Event Alerts & Booking Notifications

> **Requirement:** "Need it to get alerts for when there is a date and time requested in a booking form for the people who are actually part of the program — AND volunteers get a notice of the date and time and they can select either yes no or maybe."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Event creation alerts | `lib/notifications.ts` | `notifyAllStaffAboutEvent()` batch notifies PAYROLL + ADMIN users |
| Event update alerts | `lib/notifications.ts` | `notifyAllStaffAboutEventUpdate()` notifies about changes |
| Event cancellation | `lib/notifications.ts` | `notifyAllStaffAboutEventCancellation()` notifies all staff |
| Email reminders | `app/actions/email-reminders.ts` | 7, 5, 3, 1 day before event reminders |
| Cron processing | `app/api/cron/reminders/route.ts` | Batch processes pending reminders via Mailchimp API |
| RSVP notifications | `lib/notifications.ts` | `notifyAdminsAboutRSVP()` alerts admins of RSVPs |
| Notification bell | `components/notifications/NotificationBell.tsx` | 10-second polling, unread count badge |
| Notification center | `app/notifications/page.tsx` | Full notification management with preferences |

**What works:**
- In-app notifications with 10s polling for near-real-time delivery
- Email reminders scheduled at 7/5 days (for homes) and 3/1 days (for staff)
- 27+ distinct notification types with unique icons and colors
- Per-user notification preferences (email, SMS, in-app toggles)
- RSVP system with YES/NO/MAYBE options

**What's missing:**
- Notifications go to ALL PAYROLL/ADMIN users, not targeted to staff assigned to specific programs
- Sunshine singers and volunteers are not specifically targeted — only PAYROLL and ADMIN roles receive event notifications
- No "if really needed" option for RSVP (only yes/no/maybe)

---

### 1.3 Home Booking & Calendar System

> **Requirement:** "If a home has a subscription, linking a calendar to the booking form to show that they are booked for the whole year."

**Status: ⚠️ PARTIALLY IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Home model | `prisma/schema.prisma` | GeriatricHome with `isPartner`, `newsletterSub` fields |
| Home dashboard | `app/dashboard/page.tsx` | Shows upcoming events, stats for HOME_ADMIN |
| Calendar view | `components/dashboard/HomeCalendarView.tsx` | Calendar displaying home's events |
| Event requests | `app/actions/event-requests.ts` | Homes can request existing or custom events |
| Custom requests | `components/event-requests/CustomEventRequestForm.tsx` | Multi-date preferred date selection |
| Request list | `components/event-requests/RequestList.tsx` | Home views their requests with status |
| Admin approval | `components/event-requests/AdminRequestList.tsx` | Admin reviews/approves/rejects requests |

**What works:**
- Homes self-register at `/register/home` with facility details
- Homes can request existing events or create custom event requests
- Multi-date preferred date selection with staff availability workflow
- Admin approval pipeline: request → staff availability → date selection → event creation
- Home dashboard shows their events and stats

**What's missing:**
- No subscription/contract model for annual bookings
- No "booked for the whole year" calendar view
- No recurring event scheduling (e.g., weekly sunshine sessions for a full year)
- `isPartner` field exists but doesn't unlock any special functionality

---

### 1.4 Hour Logging & Payroll Connection

> **Requirement:** "A way for people to check in and just log how many hours they worked and connect it directly to a program so that it can be forwarded to Lisa and she knows who to pay and from what funding account."

**Status: ✅ MOSTLY IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Weekly timesheet | `app/payroll/timesheet/page.tsx` | Weekly timesheet with day-by-day entries |
| Timesheet form | `components/timesheet/WeeklyTimesheetForm.tsx` | Check-in/out times, manual hours, funding class |
| Timesheet actions | `app/actions/timesheet.ts` | Create, submit, approve, reject timesheets |
| Admin review | `app/admin/timesheets/page.tsx` | Review pending timesheets with detail view |
| Mileage tracking | `app/payroll/mileage/page.tsx` | Monthly mileage with start/end locations |
| Mileage actions | `app/actions/mileage.ts` | Submit, approve, reject mileage entries |
| Admin mileage | `app/admin/mileage/page.tsx` | Approve/reject mileage with stats |

**What works:**
- Weekly timesheet with check-in/check-out times and manual hour entry
- Funding class field per entry (connects hours to funding source)
- Program name per timesheet entry
- Submit → Admin Review → Approve/Reject workflow with notifications
- Mileage tracking with kilometer logging and funding class
- Rejection includes notes explaining why

**What's missing:**
- No automatic forwarding/export to payroll processor ("Lisa")
- No bi-weekly payment summary generation
- No multi-funder split per single entry (only one funding class per entry)
- No QuickBooks integration or CSV/spreadsheet export
- No automatic connection between event check-in and timesheet entry creation

---

### 1.5 Receipt & Expense System

> **Requirement:** "Workers inputting their receipts into the app and it automatically records it into an expense form... at the end of the month it puts all of them together in a spreadsheet sent to me for approval."

**Status: ✅ IMPLEMENTED (core), ❌ MISSING (reporting)**

| Component | Location | Details |
|-----------|----------|---------|
| Expense requests | `app/payroll/requests/page.tsx` | Submit expenses, sick days, time off |
| Request actions | `app/actions/requests.ts` | CRUD for expense requests |
| File upload | `app/actions/file-upload.ts` | Receipt upload (PDF, JPG, PNG, max 5MB) |
| Admin review | `app/admin/requests/page.tsx` | Approve/reject with status tracking |
| Financial hub | `app/admin/financials/page.tsx` | Combined view: timesheets, mileage, expenses |
| Notifications | `lib/notifications.ts` | Admin notified on submission, staff on approval/rejection |

**What works:**
- Three request categories: EXPENSE, SICK_DAY, OFF_DAY (time off)
- Receipt/document upload with file type validation
- Admin approval workflow with status tracking
- Notification on both submission and decision
- Combined financial management hub for admin

**What's missing:**
- No monthly auto-tallying into spreadsheet
- No end-of-month batch report generation
- No "quick pay" override for urgent reimbursements
- No QuickBooks integration
- Individual approvals only — no bulk operations

---

### 1.6 Worker Profiles

> **Requirement:** "Each worker has their own profile on their app with all of their details and contact info and what programs they are involved in."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Profile form | `components/staff/ProfileForm.tsx` | 5 tabs: Personal, Employment, Emergency, Health, Intake |
| Profile actions | `app/actions/staff.ts` | `updateStaffProfile()` with all fields |
| Directory | `app/staff/directory/page.tsx` | Searchable staff directory |
| Directory card | `components/staff/StaffDirectoryCard.tsx` | Avatar, name, role, region, bio |
| Public profile | `components/staff/StaffPublicProfile.tsx` | Detailed view with upcoming events |
| Admin user mgmt | `app/admin/users/page.tsx` | Manage roles, status, view details |

**Profile fields available:**
- **Personal:** preferred name, pronouns, date of birth, address, bio
- **Employment:** position, employment type/status, start date, region (read-only for staff)
- **Emergency:** contact name, relationship, phone
- **Health:** allergies, dietary restrictions, mobility needs, medical conditions
- **Intake:** strengths/skills, preferred tasks (1-5 rating), hobbies/fun facts

**What's missing:**
- No dual-role support (e.g., someone who is both PAYROLL and VOLUNTEER)
- Employment fields are read-only for staff — admin must set them, but there's no admin UI to edit individual employment fields
- No direct "what programs they are involved in" section (events are shown but not program assignments)
- No volunteer-specific hour tracking for year-end reporting

---

### 1.7 Messaging & Group Chats

> **Requirement:** "Set up small group chats for the staff that work together a lot... direct messaging to individuals — but setting up who can direct message who."

**Status: ✅ IMPLEMENTED (messaging), ⚠️ PARTIAL (DM controls)**

| Component | Location | Details |
|-----------|----------|---------|
| Group management | `app/actions/messaging.ts` | Create, join, leave, manage groups |
| Group messaging | `components/messaging/MessageThread.tsx` | Real-time group messages with reactions |
| DM conversations | `app/actions/conversations.ts` | 1-on-1 conversations with message history |
| DM chat | `components/messaging/ChatInterface.tsx` | DM interface with edit/delete |
| Admin panel | `components/admin/communication/AdminMessagingPanel.tsx` | Admin DM + group management |
| Group discovery | `components/messaging/UnifiedInbox.tsx` | Browse and join/request groups |
| Message reactions | `components/messaging/MessageReactions.tsx` | Emoji reactions on group messages |
| Notifications | `app/actions/messaging.ts` | All messaging events trigger notifications |

**What works:**
- Admin creates groups (CUSTOM, EVENT_BASED, ROLE_BASED)
- Open groups (allowAllStaff) — instant join
- Private groups — request access, admin approves/denies
- Group message notifications to all members
- DM conversations with message history
- Edit/delete messages within 15 minutes
- Emoji reactions on group messages
- Member management (add, remove, leave)

**What's missing:**
- `DirectMessageRequest` model exists in schema but DM approval is NOT enforced
- Anyone can DM anyone — no "volunteer can't message cast members unless approved" control
- Admin conversation request review component exists but isn't wired to block unauthorized DMs

---

### 1.8 Donor Tracking

> **Requirement:** "This would be a great way to track our donors as well — if it was linked to Canada Helps and/or PayPal."

**Status: ✅ IMPLEMENTED (tracking), ❌ MISSING (integrations)**

| Component | Location | Details |
|-----------|----------|---------|
| Donor model | `prisma/schema.prisma` | Donor with tiers, types, status, recurring flags |
| Donation model | `prisma/schema.prisma` | Amount, method, campaign, program type, receipt tracking |
| Donor actions | `app/actions/donors.ts` | CRUD operations for donors and donations |
| Admin donor page | `app/admin/donors/page.tsx` | Stats, donor list, tier badges |

**What works:**
- Full donor profiles with tiers (CHAMPION, BENEFACTOR, PATRON, SUPPORTER)
- Donation tracking: amount, currency, method, campaign, program type
- Tax receipt tracking (receipt numbers, issued status, dates)
- Thank you letter tracking
- Recurring donor flag
- Total donated and donation count per donor

**What's missing:**
- No Canada Helps API integration
- No PayPal/payment platform integration
- No automatic donation import
- No annual report generator for year-end
- Admin donor page is read-only (no create/edit UI visible)

---

### 1.9 Form Templates & Documents

> **Requirement:** "It includes the templates of forms that need to be signed... mileage forms or expense form templates are also available."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Template management | `app/actions/form-templates.ts` | Full CRUD with submissions |
| Admin templates | `app/admin/form-templates/page.tsx` | Create, filter, manage templates |
| Staff forms | `app/staff/forms/page.tsx` | Browse templates, view submissions |
| Document manager | `components/staff/DocumentManager.tsx` | Upload/manage personal documents |

**Categories:** INCIDENT, FEEDBACK, EVALUATION, ADMINISTRATIVE, HEALTH_SAFETY, OTHER

**What works:**
- Template library with categories and version tracking
- Upload, download, submit, review workflow
- Fillable forms with dynamic JSON fields
- Submission tracking with admin review (approve/reject with notes)
- Download and usage count tracking
- Staff can browse by category and track their submissions

---

### 1.10 Inventory & Merchandise

> **Requirement:** "If we could have a place to list merchandise for homes and staff — we can also list the discount prices for staff, and the bulk prices for homes and schools."

**Status: ⚠️ PARTIALLY IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Inventory model | `prisma/schema.prisma` | Items with SKU, quantity, pricing, categories |
| Transaction model | `prisma/schema.prisma` | IN/OUT/ADJUSTMENT tracking |
| Inventory actions | `app/actions/inventory.ts` | CRUD + transaction logging |
| Admin inventory | `app/admin/inventory/page.tsx` | Stats, low stock alerts, category view |

**What works:**
- Items with name, description, category, SKU, quantity, pricing
- Min/max quantity thresholds with low stock alerts
- Size, color, image URL, tags, location, supplier tracking
- Transaction logging (IN, OUT, ADJUSTMENT) with reason and user

**What's missing:**
- Admin view is **read-only** — no visible UI to create/edit/delete items
- No staff vs. home pricing tiers
- No bulk/discount pricing
- No pre-order system
- No online purchase flow
- No `isForSale` distinction surfaced in UI (field exists in model)

---

### 1.11 Testimonials

> **Requirement:** "The actual testimonials or quotes we get can be separated by program automatically and can be clicked on as *love* to make them come to the top."

**Status: ✅ MOSTLY IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Testimonial model | `prisma/schema.prisma` | With programType, eventId, rating, featured flag |
| Testimonial actions | `app/actions/testimonials.ts` | CRUD with review workflow |
| Admin testimonials | `app/admin/testimonials/page.tsx` | View with status, ratings, featured badges |

**What works:**
- Testimonials with author info, organization, content, rating (1-5 stars)
- Program type and event linking
- Featured testimonial flag with display ordering
- Photo and video URL support
- Admin review workflow (APPROVED, PENDING, REJECTED)
- Collection tracking (who collected, when, reviewed by)

**What's missing:**
- No auto-separation by program in the UI
- No "love"/starring system for ranking (featured flag exists but no voting)
- No public submission form for non-staff
- No public-facing testimonial display page

---

### 1.12 Event Engagement (Comments, Photos)

> **Requirement:** "A place where everyone could upload their pictures — a way to easily share pictures from the event and link it to the calendar date."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Comments | `app/actions/event-engagement.ts` | Threaded comments with reactions |
| Photos | `app/actions/event-engagement.ts` | Photo gallery per event |
| Reactions | `app/actions/event-engagement.ts` | Like/Heart/Downvote on comments and photos |
| Engagement UI | `components/events/EventEngagement.tsx` | Tabs: Comments + Photos with full interaction |

**What works:**
- Threaded comment system with replies
- Photo gallery per event with captions
- Reactions on both comments and photos (Like, Heart, Downvote)
- Edit/delete own comments and photos
- Admin can delete any comment/photo
- Notifications for replies and reactions

**What's missing:**
- Photo upload is **URL-based only** — no actual file storage/upload
- No photo release template integration
- No automatic linking of photos to calendar dates

---

### 1.13 Home Registration & Booking

> **Requirement:** "Booking system — desktop/web option... they would just need to put their email in to login and then they would also have a private profile."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Registration form | `components/forms/HomeRegistrationForm.tsx` | Multi-step: Account → Facility → Contact |
| Registration action | `app/actions/home-registration.ts` | Creates User + GeriatricHome with rate limiting |
| Home management | `app/actions/home-management.ts` | Update details, personnel, accessibility |
| Home admin pages | `app/dashboard/` | Full dashboard for HOME_ADMIN role |

**What works:**
- Self-registration at `/register/home` with 3-step form
- Captures: facility name, address, capacity, resident count, contacts, emergency protocols, trigger warnings
- Rate limited (3 attempts/hour per IP)
- HOME_ADMIN gets their own dashboard with events, calendar, requests
- Personnel management (additional contacts at facility)
- Accessibility info, photo permissions, trigger warnings

---

### 1.14 Calendar Integration

> **Requirement:** "Ideally the calendar in the app can also link to other calendars like Google or Apple calendars so when they appear in their own calendars."

**Status: ⚠️ PARTIALLY IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Add to Calendar | `components/events/AddToCalendar.tsx` | Google Calendar link + .ICS file download |
| Public calendar | `components/events/PublicCalendarView.tsx` | In-app calendar view |
| Admin calendar | `components/admin/events/AdminCalendarView.tsx` | Admin event calendar |
| Home calendar | `components/dashboard/HomeCalendarView.tsx` | Home-specific calendar |

**What works:**
- "Add to Google Calendar" button (opens Google Calendar in new tab)
- Download .ICS file for local calendar import
- In-app calendar views for all roles

**What's missing:**
- No persistent iCal feed URL (users must add each event manually)
- No Apple Calendar direct integration
- No real-time sync — events added after download won't appear

---

### 1.15 Notification System

> **Requirement:** "They will get alerts or email reminders."

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Notification library | `lib/notifications.ts` | 27+ types, multi-channel (in-app, email, SMS) |
| Notification actions | `app/actions/notifications.ts` | CRUD, mark read, clear |
| Notification bell | `components/notifications/NotificationBell.tsx` | Dropdown with 10s polling |
| Notification list | `components/notifications/NotificationList.tsx` | Grouped by day, type-specific icons |
| Preferences | `components/notifications/NotificationPreferences.tsx` | Email/SMS/in-app toggles |
| Email reminders | `app/actions/email-reminders.ts` | Scheduled reminders via Mailchimp |
| Cron endpoint | `app/api/cron/reminders/route.ts` | Processes pending reminders |

**Notification types with icons:**
- Events: `EVENT_CREATED`, `EVENT_UPDATED`, `EVENT_CANCELLED` (Calendar icon, blue)
- Attendance: `RSVP_RECEIVED`, `STAFF_CHECKIN` (UserCheck icon, green)
- Expenses: `EXPENSE_SUBMITTED`, `EXPENSE_APPROVED`, `EXPENSE_REJECTED` (Info icon, amber)
- Messaging: `DIRECT_MESSAGE`, `GROUP_MESSAGE` (MessageSquare/Users icon, indigo)
- Groups: `GROUP_ACCESS_REQUEST`, `GROUP_ACCESS_APPROVED`, `GROUP_ACCESS_DENIED`, `GROUP_ADDED`, `GROUP_REMOVED`, `GROUP_MEMBER_LEFT` (UserPlus/UserMinus, orange/green/red)
- Timesheets: `TIMESHEET_SUBMITTED`, `TIMESHEET_APPROVED`, `TIMESHEET_REJECTED` (FileText, cyan)
- Mileage: `MILEAGE_APPROVED`, `MILEAGE_REJECTED` (MapPin, teal)
- Communication: `PHONE_REQUEST`, `PHONE_REQUEST_RESPONSE`, `MEETING_REQUEST`, `MEETING_REQUEST_RESPONSE` (Phone/Video, violet/sky)
- Engagement: `COMMENT_REPLY`, `COMMENT_REACTION`, `PHOTO_REACTION` (Reply/ThumbsUp/Heart)

**What's missing:**
- Email and SMS are **placeholder implementations** (console.log only)
- No real email service integration (Mailchimp template exists for reminders only)
- No real SMS service

---

### 1.16 Invitation System

> **Requirement:** Implied — need a way to bring new users into the system.

**Status: ✅ IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| Invitation actions | `app/actions/invitation.ts` | Create, accept, cancel invitations |
| Admin invitations | `app/admin/invitations/page.tsx` | Send invites with role selection |
| Accept page | `app/invite/[token]/page.tsx` | Token-based acceptance with password setup |

**What works:**
- Admin creates invitation with email + role
- 7-day expiration with unique token
- Supports all roles: ADMIN, PAYROLL, CONTRACTOR, FACILITATOR, PARTNER, VOLUNTEER, BOARD
- Invitation acceptance creates user account
- Cancel pending invitations

---

### 1.17 Board Member Access

> **Requirement:** "With the board side of things they would get very little notification unless it was approved by ED/chair."

**Status: ⚠️ PARTIALLY IMPLEMENTED**

| Component | Location | Details |
|-----------|----------|---------|
| BOARD role | `auth.ts` | Role exists in system |
| Board menu | `lib/menu.ts` | Minimal menu: Dashboard, Events, Directory, Inbox, Profile, Settings |

**What works:**
- BOARD role with restricted menu
- Board members can view events, directory, inbox, and their profile
- Board members can DM other users

**What's missing:**
- No ED/chair approval gate for board notifications
- Board members receive ALL notifications like everyone else
- No restricted profile visibility (board profiles visible to all staff)

---

## 2. Features That Need to Be Implemented

### 2.1 Phone Call & Inquiry Tracking

> **Requirement:** "Ideally we also record all phone calls and inquiries and what it was about to track the outreach. Then if it needs to go to someone else they can tag them in it to get a summary of the phone conversation and follow up information."

**Status: ❌ NOT IMPLEMENTED**

No model, no actions, no UI exists for this feature.

**What's needed:**
- New `PhoneInquiry` model: caller info, subject, notes, assigned staff, tags, follow-up date, status
- Admin page `/admin/inquiries` with create/assign/resolve workflow
- Tag/mention system for transferring inquiries between staff
- Follow-up reminders via notification system
- Outreach history tracking

---

### 2.2 Facilitator Feedback Pop-ups

> **Requirement:** "If the facilitator feedback forms could pop up as an alert on their phone (or desktop) for everyone within 1 hour after the session — for the volunteers/workers at the session as well as the booker."

**Status: ❌ NOT IMPLEMENTED**

No post-event feedback trigger exists.

**What's needed:**
- Extend cron reminders to create `FEEDBACK_DUE` notifications 1 hour after event end
- Quick feedback form component (rating, highlights, concerns, equipment issues)
- Auto-link feedback to event and program
- Surface feedback prompt in facilitator/volunteer dashboard
- Include "alert Erin Lee" button for issues needing attention before next session

---

### 2.3 Facilitator Program Guides

> **Requirement:** "If someone is signed up as facilitator to a program ideally they get the pop-up for that program appear so they can click into it at any time to see the facilitation guides and other important info on the program as a whole. Their duties, checklists, etc."

**Status: ❌ NOT IMPLEMENTED**

**What's needed:**
- Program guide content (could extend FormTemplate with `PROGRAM_GUIDE` category)
- Link guides to Program model
- When facilitator confirms attendance to event, show program guide in their event detail
- Checklist component for duty tracking

---

### 2.4 Training Documentation Portal

> **Requirement:** "All the training documentation can also live in there for the staff/workers/volunteers to access if they have questions or want to review anything. There can also be a question box."

**Status: ❌ NOT IMPLEMENTED**

**What's needed:**
- Training docs section (could extend FormTemplate with `TRAINING` category, or dedicated model)
- Categorized by role and topic
- Question/discussion box (could extend group messaging with a `TRAINING_QA` group type)
- Searchable knowledge base

---

### 2.5 External Contacts Database

> **Requirement:** "All other contacts even those who don't have an account will need to be input with contact information. A home we haven't worked with before, but we have their information."

**Status: ❌ NOT IMPLEMENTED**

**What's needed:**
- New `ExternalContact` model: name, organization, type (GOVERNMENT/MEDIA/PARTNER/SCHOOL/OTHER), email, phone, address, region, notes, tags, last contact date
- Admin page `/admin/contacts` with CRUD and search
- Type categories for government officials, media, schools, homes-without-accounts
- Regional grouping

---

### 2.6 Government Officials & Media Lists

> **Requirement:** "Probably keeping an updated list of government officials and who has attended what and when and how often we should reach out to them. And a list of media for the same purpose."

**Status: ❌ NOT IMPLEMENTED**

Could be implemented as part of the External Contacts Database (2.5) with type filtering.

---

### 2.7 Public Testimonial Submission

> **Requirement:** "People can also add these in manually if they weren't an official worker or booker — they can go to the website and just input feedback."

**Status: ❌ NOT IMPLEMENTED**

**What's needed:**
- Public form at `/testimonials/submit` (no auth required)
- Fields: name, event (optional), experience text, rating, program
- Auto-creates Testimonial with status=PENDING
- Admin gets notified for review

---

### 2.8 Newsletter Integration

> **Requirement:** "Ideally the newsletter would be linked to this too so people could also view the newsletters on the app — where you can go in and see past ones too."

**Status: ❌ NOT IMPLEMENTED**

**What's needed:**
- Mailchimp API integration for newsletter archive
- Newsletter listing page in the app
- Subscription management

---

### 2.9 Branding Assets Hub

> **Requirement:** "All branding info would be there too — if anyone needs to take our logo for a poster they are making they can — also if it can link into Canva for those who use it."

**Status: ❌ NOT IMPLEMENTED**

**What's needed:**
- Branding/assets page with logo downloads, brand guidelines
- Links to Canva templates
- Approval workflow for branded materials

---

### 2.10 DM Approval Controls (Enforcement)

> **Requirement:** "Setting up who can direct message who — ex. A volunteer can't message one of the cast members unless it is approved."

**Status: ⚠️ MODEL EXISTS, NOT ENFORCED**

The `DirectMessageRequest` model exists in the database schema with status and reviewer fields. The `ConversationRequestsList` admin component exists. But the approval flow is **not enforced** in the DM sending logic.

**What's needed:**
- Add role-based permission check to `sendMessage()` in `conversations.ts`
- Define DM permission matrix (e.g., ADMIN → anyone, VOLUNTEER → needs approval for non-admin)
- Wire `DirectMessageRequest` approval into the admin communication panel
- Block DM attempts that don't have an approved request

---

### 2.11 Budget Visibility Feature

> **Requirement:** "If there is a budget feature for people who need to be aware of certain budgets and pay."

**Status: ❌ NOT IMPLEMENTED**

The `Program` model has a `budget` field, but it's not surfaced in any UI.

**What's needed:**
- Budget dashboard for admins showing program budgets vs. actual spending
- Payroll staff view of relevant budget info
- Spending tracking linked to timesheets and expenses

---

### 2.12 SIN Number Security Display

> **Requirement:** "For workers who sign on — if their SIN number is there is *** **23 starred out because if a hack we don't wanna be responsible for that."

**Status: ⚠️ PARTIALLY IMPLEMENTED**

`sinHash` field exists on User model (stored as hash, which is the correct security approach — SIN is never stored in plaintext). But there's no UI to input or display a masked SIN.

**What's needed:**
- Secure SIN input in profile (hash on submit, never store plaintext)
- Display only last 3 digits with masking (***-***-123)
- Admin security verification to view full SIN

---

### 2.13 Regional Filtering

> **Requirement:** "Sort people by region — Avalon, Eastern, Central, Western, Northern-Labrador — and tags @ can be a way to let people know if someone or something needs their attention."

**Status: ⚠️ PARTIALLY IMPLEMENTED**

The `region` field exists on the User model and in ProfileForm, but there's no filtering by region in any search or directory view.

**What's needed:**
- Region filter dropdown in staff directory
- Region filter in event listings
- Region filter in admin user management
- @mention/tag system in messages for attention routing

---

## 3. Upgrades & Changes Needed

### Priority: HIGH

| # | Feature | Current State | Change Needed | Impact |
|---|---------|--------------|---------------|--------|
| 1 | **Payroll Export** | Timesheets approved but no export | Add CSV/spreadsheet export with bi-weekly summaries, funding class breakdowns | Critical for payroll processing |
| 2 | **Monthly Expense Report** | Individual approvals only | Add batch report generation with per-person tallies | Critical for accounting |
| 3 | **Targeted Event Notifications** | All PAYROLL/ADMIN get notified | Notify only assigned/relevant staff based on program or confirmed attendance | Reduces noise, improves relevance |
| 4 | **Inventory CRUD UI** | Read-only admin view | Add create/edit/delete UI for inventory items | Feature is unusable without it |
| 5 | **Profile Employment Admin UI** | Staff can't edit; no admin UI for it | Add employment field editing in admin user detail page | Blocks proper user setup |
| 6 | **Photo Upload Infrastructure** | URL-based only (no file storage) | Integrate Vercel Blob, S3, or Cloudinary | Photos, receipts, documents all need this |
| 7 | **Calendar Feed (iCal)** | Manual add only | Generate per-user iCal feed URL for real calendar sync | High user demand per requirements |
| 8 | **DM Approval Enforcement** | Model exists, not enforced | Add role-based permission check to DM sending | Required by requirements doc |
| 9 | **Email Service** | Placeholder (console.log) | Integrate Resend, SendGrid, or similar | Notifications don't actually email |
| 10 | **SMS Service** | Placeholder (console.log) | Integrate Twilio or similar | SMS notifications non-functional |

### Priority: MEDIUM

| # | Feature | Current State | Change Needed |
|---|---------|--------------|---------------|
| 11 | **Dual Role Support** | Single role per user | Allow primary + secondary roles (e.g., PAYROLL + VOLUNTEER) |
| 12 | **Volunteer Hour Tracking** | No volunteer-specific tracking | Add volunteer check-in with hour logging for year-end |
| 13 | **Board Notification Gating** | Board gets all notifications | Add ED/chair approval for board-visible notifications |
| 14 | **Home Subscription Model** | No subscription concept | Add annual booking view for partner homes |
| 15 | **Testimonial Auto-categorize** | Manual assignment only | Auto-link testimonials from event feedback to program types |
| 16 | **Staff Event Targeting** | Blanket notifications | Assign staff to programs, notify only relevant staff |
| 17 | **Check-in → Timesheet Auto** | Manual timesheet entry | Auto-create timesheet entry from event check-in/out |

### Priority: LOW

| # | Feature | Current State | Change Needed |
|---|---------|--------------|---------------|
| 18 | **Multi-funder Split** | Single funding class per entry | Allow multiple funding sources per timesheet entry |
| 19 | **Waitlist System** | No waitlist when events full | Add waitlist with auto-notify when spots open |
| 20 | **Bulk Admin Actions** | One-by-one approvals | Bulk approve/reject for timesheets, mileage, requests |
| 21 | **Generic Home Login** | Per-person login only | Shared facility login for homes where staff change |
| 22 | **Donor CRUD UI** | Read-only admin page | Add create/edit/delete UI for donors and donations |
| 23 | **Testimonial Public Page** | No public display | Create public-facing testimonial showcase page |

---

## 4. Best Implementation Approach for New Features

### Phase 1: Core Infrastructure (Unblocks Multiple Features)

#### 1A. File Upload Service
**Why first:** Needed for photos, receipts, documents, profile images, and branding assets.

```
Recommended: @vercel/blob (simplest for Vercel deployment)
Alternative: AWS S3 + presigned URLs

Implementation:
1. Install @vercel/blob
2. Create app/actions/upload.ts with upload/delete actions
3. Create app/api/upload/route.ts for client-side uploads
4. Replace URL-based photo uploads in event-engagement.ts
5. Wire into expense receipt uploads, profile images, documents
```

#### 1B. Email Service Integration
**Why first:** All notifications reference email but none actually send.

```
Recommended: Resend (modern, Next.js-friendly, good free tier)
Alternative: SendGrid

Implementation:
1. Install resend package
2. Create lib/email.ts with send function and templates
3. Replace console.log in lib/notifications.ts sendEventNotificationEmail()
4. Replace console.log in sendSMS() (or integrate Twilio separately)
5. Add email templates for each notification type
```

#### 1C. Payroll Export & Reporting
**Why first:** Highest business-value gap — payroll can't function without it.

```
Implementation:
1. Create app/admin/payroll-export/page.tsx
2. Add date range selector (bi-weekly periods)
3. Query approved timesheets + mileage for period
4. Generate CSV with: employee, hours, funding class, program, mileage, expenses
5. Add download button
6. Consider scheduled auto-generation via cron
```

---

### Phase 2: Communication Enhancements

#### 2A. DM Approval Enforcement
```
Implementation:
1. Define permission matrix in lib/dm-permissions.ts:
   - ADMIN → can message anyone
   - PAYROLL/FACILITATOR → can message any staff
   - VOLUNTEER → needs approved DirectMessageRequest for non-admin/non-facilitator
   - BOARD → can message ADMIN only, needs approval for others
2. Add check to conversations.ts sendMessage()
3. Wire admin review in AdminMessagingPanel
4. Show "Request to Message" button instead of "Send Message" when permission needed
```

#### 2B. Phone Inquiry Tracking
```
New Prisma model:
  PhoneInquiry {
    id        String   @id @default(cuid())
    callerName    String
    callerPhone   String?
    callerOrg     String?
    subject       String
    notes         String
    assignedToId  String?
    tags          String?    // JSON array
    followUpDate  DateTime?
    status        String     @default("OPEN")  // OPEN, ASSIGNED, RESOLVED
    createdById   String
    createdAt     DateTime   @default(now())
    updatedAt     DateTime   @updatedAt
  }

New files:
  - app/actions/inquiries.ts (CRUD + assign + resolve)
  - app/admin/inquiries/page.tsx (list + create + manage)
  - components/admin/InquiryList.tsx (UI component)
```

#### 2C. Post-Event Feedback System
```
Implementation:
1. Extend cron reminders to create FEEDBACK_DUE notification 1 hour after event end
2. Create FeedbackPrompt component shown in staff dashboard after events
3. Quick feedback form: rating (1-5), highlights, concerns, equipment issues, flag-for-attention checkbox
4. Auto-link to event and program
5. If flagged, notify admin immediately
6. Feed into testimonials pipeline (with staff approval)
```

---

### Phase 3: Data & Reporting

#### 3A. External Contacts Database
```
New Prisma model:
  ExternalContact {
    id            String   @id @default(cuid())
    name          String
    organization  String?
    type          String     // GOVERNMENT, MEDIA, PARTNER, SCHOOL, HOME, OTHER
    email         String?
    phone         String?
    address       String?
    region        String?
    notes         String?
    tags          String?    // JSON array
    lastContactDate DateTime?
    outreachLog   String?    // JSON array of {date, notes, by}
    createdAt     DateTime   @default(now())
    updatedAt     DateTime   @updatedAt
  }

New files:
  - app/actions/contacts.ts
  - app/admin/contacts/page.tsx
  - components/admin/ContactList.tsx
```

#### 3B. Regional Filtering
```
Implementation:
1. Define regions: AVALON, EASTERN, CENTRAL, WESTERN, NORTHERN_LABRADOR
2. Add region filter to components/staff/StaffDirectoryCard.tsx search
3. Add region filter to app/staff/directory/page.tsx
4. Add region filter to app/admin/users/page.tsx
5. Add region to Event/Location model if needed
6. Add region-based notification routing
```

#### 3C. Calendar Sync (iCal Feed)
```
Implementation:
1. Create app/api/calendar/[userId]/route.ts
2. Generate ICS feed with all confirmed events for user
3. User copies feed URL into Google Calendar / Apple Calendar
4. Feed auto-updates as events change (calendar apps re-fetch periodically)
5. Add "Subscribe to Calendar" button in settings with copy-to-clipboard URL
```

---

### Phase 4: Advanced Features

#### 4A. Home Subscription & Annual Booking
```
New Prisma model:
  HomeSubscription {
    id          String   @id @default(cuid())
    homeId      String
    year        Int
    programType String
    frequency   String   // WEEKLY, BIWEEKLY, MONTHLY
    preferredDay String?
    status      String   @default("ACTIVE")
    startDate   DateTime
    endDate     DateTime
    createdAt   DateTime @default(now())
  }

Implementation:
1. Admin creates subscription for partner home
2. Auto-generate recurring event requests based on frequency
3. Annual calendar view showing all booked dates
4. Renewal reminders before year-end
```

#### 4B. Training & Knowledge Base
```
Implementation options:
Option A: Extend FormTemplate with TRAINING category + rich content field
Option B: New TrainingDoc model with markdown content

Recommended: Option A (less schema change)
1. Add TRAINING to FormTemplate categories
2. Create /staff/training page listing training docs
3. Add role-based visibility (some docs only for facilitators, etc.)
4. Add Q&A section using group messaging with TRAINING_QA group type
```

#### 4C. Public Testimonial Page
```
Implementation:
1. Create app/(public)/testimonials/page.tsx (no auth required)
2. Display approved, featured testimonials grouped by program
3. Create app/(public)/testimonials/submit/page.tsx for public feedback
4. Public submissions create PENDING testimonials for admin review
5. "Love" button increments display score (new field on Testimonial model)
```

---

## 5. Full Database Model Reference

### Core Models (37 total)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | All system users | name, email, password, role, status, phone, bio, region, position, notificationPreferences |
| **GeriatricHome** | Registered facilities | name, address, capacity, contacts, triggerWarnings, accommodations |
| **Event** | Programs/events | title, dates, location, status, maxAttendees, origin |
| **EventAttendance** | RSVP + check-in | userId, eventId, status (YES/NO/MAYBE), checkInTime |
| **Program** | Program definitions | name, description, budget, year |
| **Location** | Event venues | name, address, type, coordinates |

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **DirectMessage** | 1-on-1 messages | senderId, recipientId, subject, content, read |
| **MessageGroup** | Chat groups | name, type, allowAllStaff, iconEmoji, color |
| **GroupMessage** | Group messages | groupId, senderId, content, attachments |
| **GroupMember** | Group membership | groupId, userId, role, isActive, isMuted |
| **MessageReaction** | Emoji reactions | messageId, userId, emoji |
| **DirectMessageRequest** | DM approval | requesterId, requestedId, status, reviewedById |

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Notification** | In-app alerts | userId, type, title, message, link, read |
| **EmailReminder** | Scheduled emails | eventId, recipientType, scheduledFor, status |
| **Invitation** | User invitations | email, role, token, expiresAt, status |
| **AuditLog** | Action tracking | action, details, userId |

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Timesheet** | Weekly timesheets | userId, weekStart, status, submittedAt |
| **TimesheetEntry** | Daily entries | date, programName, hours, fundingClass, checkInTime |
| **MileageEntry** | Travel tracking | date, startLocation, endLocation, kilometers, fundingClass |
| **ExpenseRequest** | Expense/time-off | amount, description, category, status, receiptUrl |
| **TimeEntry** | Simple time log | date, hours, status |
| **WorkLog** | Work sessions | date, startTime, endTime, type, activities |

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Donor** | Donor profiles | name, type, tier, status, totalDonated |
| **Donation** | Individual donations | amount, method, campaign, receiptNumber |
| **InventoryItem** | Merchandise/supplies | name, category, SKU, quantity, price |
| **InventoryTransaction** | Stock changes | type (IN/OUT/ADJUSTMENT), quantity |
| **FormTemplate** | Document templates | title, category, fileUrl, formFields |
| **FormSubmission** | Completed forms | formData, status, reviewedBy |
| **Document** | User documents | name, url, type, verified |

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Testimonial** | Feedback/quotes | content, rating, programType, featured |
| **EventComment** | Event discussions | content, parentId (threading) |
| **EventPhoto** | Event gallery | url, caption, uploaderId |
| **EventReaction** | Comment/photo likes | type (LIKE/HEART/DOWNVOTE) |
| **EventRequest** | Home booking requests | type, preferredDates, status |
| **EventRequestResponse** | Staff availability | availability per date, notes |

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **PhoneRequest** | Phone number sharing | requesterId, requestedId, status |
| **MeetingRequest** | Meeting scheduling | proposedTimes, selectedTime, status |

---

## 6. File Structure Reference

### App Routes (65+ directories)
```
app/
├── (auth)/login/              # Login page
├── admin/                     # Admin dashboard & management
│   ├── communication/         # Communication hub (DMs + groups)
│   ├── conversation-requests/ # DM approval requests
│   ├── donors/                # Donor management
│   ├── email-reminders/       # Email reminder management
│   ├── event-requests/        # Booking request approval
│   ├── events/[id]/edit/      # Event CRUD
│   ├── financials/            # Timesheets + mileage + expenses hub
│   ├── form-templates/        # Template management
│   ├── homes/[id]/            # Facility management
│   ├── inventory/             # Stock management
│   ├── invitations/           # User invitations
│   ├── messaging/[id]/        # Group messaging management
│   │   ├── new/               # Create new group
│   │   └── requests/          # Access request approval
│   ├── mileage/               # Mileage approval
│   ├── profile/               # Admin profile
│   ├── requests/              # Expense/time-off approval
│   ├── settings/              # Admin settings
│   ├── testimonials/          # Testimonial review
│   ├── timesheets/[id]/       # Timesheet approval
│   └── users/[id]/            # User management
├── api/
│   ├── auth/[...nextauth]/    # NextAuth endpoints
│   └── cron/reminders/        # Scheduled reminder processing
├── dashboard/                 # HOME_ADMIN portal
│   ├── calendar/              # Facility calendar
│   ├── contacts/              # Facility contacts
│   ├── engagement/            # Event engagement
│   ├── events/                # Browse events
│   ├── history/               # Event history
│   ├── my-events/[id]/        # Confirmed events
│   ├── profile/               # Home admin profile
│   ├── requests/new/          # Submit event requests
│   └── settings/              # Settings
├── events/[id]/edit/          # Public event pages
├── invite/[token]/            # Invitation acceptance
├── notifications/             # Notification center
├── payroll/                   # Payroll staff portal
│   ├── check-in/              # Daily check-in
│   ├── history/               # Work history
│   ├── mileage/               # Mileage tracking
│   ├── profile/               # Payroll profile
│   ├── requests/              # Submit expenses/time-off
│   ├── schedule/              # View schedule
│   ├── settings/              # Settings
│   └── timesheet/             # Weekly timesheet
├── register/home/             # Home self-registration
├── staff/                     # Staff portal
│   ├── directory/[id]/        # Staff directory + profiles
│   ├── events/[id]/           # Event browsing + details
│   ├── forms/[id]/            # Form templates + submissions
│   ├── groups/[id]/           # Group messaging
│   │   └── join/[id]/         # Join group
│   ├── inbox/[id]/            # DM conversations
│   ├── messages-center/       # → Redirects to /staff/inbox
│   ├── my-events/             # Confirmed events
│   ├── profile/               # Staff profile
│   └── settings/              # Settings
```

### Server Actions (34 files)
```
app/actions/
├── admin.ts                   # Admin-specific actions (expense status)
├── attendance.ts              # RSVP + check-in
├── auth.ts                    # Authentication actions
├── communication.ts           # DMs, phone/meeting requests
├── conversation-requests.ts   # DM approval workflow
├── conversations.ts           # DM conversations
├── direct-messages.ts         # DM CRUD (search, send, read, delete)
├── directory.ts               # Staff directory
├── donors.ts                  # Donor/donation management
├── email-reminders.ts         # Scheduled email reminders
├── engagement.ts              # Event engagement (legacy?)
├── event-engagement.ts        # Comments, photos, reactions
├── event-requests.ts          # Booking request workflow
├── events.ts                  # Event CRUD
├── file-upload.ts             # File upload handling
├── form-templates.ts          # Form template CRUD + submissions
├── home-management.ts         # GeriatricHome management
├── home-registration.ts       # Home self-registration
├── inventory.ts               # Inventory CRUD
├── invitation.ts              # User invitation system
├── message-features.ts        # Message edit/delete/reactions
├── messaging.ts               # Group messaging + member management
├── mileage.ts                 # Mileage CRUD + approval
├── notifications.ts           # Notification CRUD
├── payroll.ts                 # Payroll-specific actions
├── profile.ts                 # Profile updates
├── requests.ts                # Expense/time-off requests
├── staff-attendance.ts        # Staff attendance management
├── staff.ts                   # Staff profile management
├── testimonials.ts            # Testimonial CRUD
├── timesheet.ts               # Timesheet CRUD + approval
├── user-management.ts         # Admin user management
├── user.ts                    # User preferences
└── work.ts                    # Work log actions
```

### Components (89 files)
```
components/
├── DashboardLayout.tsx              # Server-side layout wrapper
├── DashboardLayoutClient.tsx        # Client-side dashboard with sidebar
├── QuickActionHandler.tsx           # Quick action buttons
├── RequestFilters.tsx               # Request filtering UI
├── admin/
│   ├── communication/AdminMessagingPanel.tsx   # Admin DM + group sidebar
│   ├── events/AdminCalendarView.tsx            # Admin calendar
│   ├── financials/                             # Expense, mileage, timesheet lists
│   ├── shared/TabNavigation.tsx                # Reusable tab nav
│   ├── ConversationRequestsList.tsx            # DM approval list
│   ├── DeleteUserButton.tsx                    # User deletion
│   ├── EventAdminCard.tsx                      # Event management card
│   ├── EventForm.tsx                           # Event create/edit form
│   ├── FormTemplateFilters.tsx                 # Template filtering
│   ├── HomeList.tsx                            # Homes listing
│   ├── HomeQuickView.tsx                       # Home detail modal
│   ├── ManualReminderTrigger.tsx               # Manual reminder send
│   └── UsersTable.tsx                          # User management table
├── communication/
│   ├── DirectMessageModal.tsx                  # Send DM modal
│   ├── MeetingRequestModal.tsx                 # Meeting request modal
│   └── PhoneRequestButton.tsx                  # Phone number request
├── dashboard/
│   ├── DashboardStats.tsx                      # Home admin stats
│   ├── HomeCalendarView.tsx                    # Home calendar
│   ├── HomeEventHistory.tsx                    # Home event history
│   ├── HomeProfileForm.tsx                     # Home profile editing
│   └── PersonnelManager.tsx                    # Facility staff management
├── event-requests/
│   ├── AdminRequestList.tsx                    # Admin request review
│   ├── CustomEventRequestForm.tsx              # Custom event request
│   └── RequestList.tsx                         # Home request view
├── events/
│   ├── AddToCalendar.tsx                       # Google Calendar + .ICS
│   ├── EventCommunityTabs.tsx                  # Event community features
│   ├── EventEngagement.tsx                     # Comments + photos UI
│   ├── EventList.tsx                           # Event listing
│   ├── LocationCard.tsx                        # Location display
│   └── PublicCalendarView.tsx                  # Public calendar
├── expense/MileageEntryForm.tsx                # Mileage entry form
├── forms/HomeRegistrationForm.tsx              # Multi-step home registration
├── messaging/
│   ├── ChatInterface.tsx                       # DM chat interface
│   ├── ComposeMessageModal.tsx                 # Compose new message
│   ├── ConversationSplitView.tsx               # Split view inbox
│   ├── ConversationsList.tsx                   # Conversation list
│   ├── CreateGroupForm.tsx                     # Create group form
│   ├── GroupMembersList.tsx                    # Group members view
│   ├── GroupSettings.tsx                       # Group settings
│   ├── InboxList.tsx                           # Legacy inbox list
│   ├── InboxWrapper.tsx                        # Inbox wrapper
│   ├── JoinGroupForm.tsx                       # Join group form
│   ├── MessageActions.tsx                      # Message edit/delete
│   ├── MessageDetailModal.tsx                  # Message detail view
│   ├── MessageReactions.tsx                    # Emoji reactions
│   ├── MessageThread.tsx                       # Group message thread
│   ├── MessagingCenter.tsx                     # Legacy messaging center
│   ├── NewMessageModal.tsx                     # New DM modal
│   └── UnifiedInbox.tsx                        # Unified inbox with groups
├── notifications/
│   ├── NotificationBell.tsx                    # Bell icon + dropdown (10s poll)
│   ├── NotificationList.tsx                    # Grouped notification list
│   └── NotificationPreferences.tsx             # Preference toggles
├── payroll/
│   ├── SimpleCheckIn.tsx                       # Check-in component
│   └── WorkSessionManager.tsx                  # Work session tracker
├── settings/SettingsPage.tsx                   # Shared settings page
├── staff/
│   ├── DocumentManager.tsx                     # Document upload/manage
│   ├── LastLoginDisplay.tsx                    # Last login info
│   ├── ProfileForm.tsx                         # 5-tab profile editor
│   ├── StaffDirectoryCard.tsx                  # Directory card
│   ├── StaffEventDetail.tsx                    # Event detail view
│   ├── StaffEventList.tsx                      # Event listing for staff
│   ├── StaffPublicProfile.tsx                  # Public profile view
│   ├── StaffScheduleView.tsx                   # Schedule calendar
│   └── UpcomingBookingsTable.tsx               # Upcoming events table
└── timesheet/WeeklyTimesheetForm.tsx           # Weekly timesheet form
```

---

*Generated: February 2026*
*Codebase: Arts & Aging Volunteer Management System*
*Stack: Next.js 16.1.1 + Prisma 5.22.0 + SQLite + NextAuth v5 + Tailwind v4*
