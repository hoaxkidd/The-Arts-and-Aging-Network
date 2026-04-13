# Arts & Aging Admin Panel

A comprehensive volunteer management system for coordinating bookings, payroll, and geriatric home administration.

## Overview

This application provides role-based portals for managing:
- **Booking Management** - Create, schedule, and track volunteer bookings
- **Payroll Tracking** - Time entries, expense requests, and approvals
- **Geriatric Home Management** - Self-registration and booking coordination for care facilities
- **User Administration** - Invitations, role assignments, and audit logging

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Prisma | 5.22.0 | Database ORM |
| NextAuth.js | 5.0.0-beta.30 | Authentication |
| Tailwind CSS | 4.x | Styling |
| PostgreSQL | (via `DATABASE_URL`) | Primary database ([prisma/schema.prisma](prisma/schema.prisma)) |
| Zod | 4.3.5 | Schema validation |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up the database (see docs/CODEBASE_ARCHITECTURE.md for architecture overview)
npx prisma db push
# Or: npm run db:push  # loads .env.local via scripts/with-env.mjs

# Seed initial data (optional)
npx prisma db seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
AUTH_SECRET="your-secure-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

> **Important**: Change `AUTH_SECRET` to a secure random string in production.

## User Roles

| Role | Primary portal | Description |
|------|----------------|-------------|
| `ADMIN` | `/admin/*` | Full system access, user management, approvals |
| `PAYROLL` | `/payroll/*` | Time tracking, mileage, forms, requests |
| `HOME_ADMIN` | `/dashboard/*` | Program Coordinator portal for booking requests and home profile management |
| `FACILITATOR` | `/staff/*` (+ shared `/bookings`) | Staff inbox, bookings, directory, forms, profile |
| `BOARD` | `/staff/*` (+ shared `/bookings`) | Board member staff shell |
| `PARTNER` | `/staff/*` (+ shared `/bookings`) | Partner staff shell |
| `VOLUNTEER` | `/volunteer/*` (+ `/staff/inbox`, `/staff/groups`, `/bookings`) | Volunteer portal; messaging subsets per middleware |

See [lib/roles.ts](lib/roles.ts) and [middleware.ts](middleware.ts) for the source of truth.

**Multi-role users:** logging in without a `callbackUrl` redirects to `/choose-role`; each option links to `/role/select` (sets the `active_role` cookie) before landing in the correct portal.

## Project Structure

```
/app
  /(auth)/login        # Authentication pages
  /admin               # Admin portal (ADMIN only)
  /payroll             # Payroll portal (PAYROLL only)
  /dashboard           # Program Coordinator portal (HOME_ADMIN only)
  /bookings              # Booking pages (all authenticated users)
  /invite/[token]      # Invitation acceptance
  /register/home       # Geriatric home self-registration
  /volunteer           # Volunteer portal (VOLUNTEER role)
  /notifications       # Notification center (authenticated)
  /actions             # Server actions ('use server' modules)
  /api                 # API routes

/components
  /admin               # Admin-specific components
  /dashboard           # Program Coordinator components
  /bookings              # Booking-related components
  /notifications       # Notification UI
  /payroll             # Payroll components
  /ui                  # Base UI components

/lib
  prisma.ts            # Prisma client singleton
  notifications.ts     # Notification system
  rate-limit.ts        # Rate limiting utility
  utils.ts             # Utility functions

/prisma
  schema.prisma        # Database schema
  migrations/          # Database migrations

/docs
  CODEBASE_ARCHITECTURE.md  # Stack, domains, routes, auth, actions inventory
  SECURITY_AUDIT.md         # Security review findings
  PAYROLL_USER_GUIDE.md     # Payroll user documentation
  TABLE_STANDARDS.md        # UI table conventions
```

## Key Features

### Authentication & Authorization
- Email/password login with bcrypt hashing
- JWT-based sessions
- Role-based route protection via middleware
- Rate limiting on login (5 attempts per minute)

### Booking Management
- Create/edit/delete bookings with location management
- RSVP system (Yes/No/Maybe) with capacity limits
- Day-of check-in functionality
- Photo uploads and comments
- Feedback/rating system

### Payroll System
- Daily time entry submission
- Expense/sick day/time off requests
- Admin approval workflow
- Audit trail for all entries

### Notification System
- In-app notifications
- Email notifications (placeholder - implement with SendGrid/Resend)
- SMS notifications (placeholder - implement with Twilio)
- User preference controls

### Geriatric Home Management
- Self-registration for facility administrators
- Booking calendar specific to facility
- Staff contact directory

## Architecture and server actions

For a full **feature and architecture inventory** (stack, Prisma domains, routing by role, middleware, and action modules), see **[docs/CODEBASE_ARCHITECTURE.md](docs/CODEBASE_ARCHITECTURE.md)**.

Business logic is implemented primarily as **Server Actions** in [`app/actions/`](app/actions/) (dozens of modules). Examples:

| File | Examples |
|------|----------|
| `auth.ts` | Authentication helpers |
| `bookings.ts` | Booking CRUD and workflows |
| `attendance.ts` | RSVP, check-in |
| `invitation.ts` | Invites and acceptance |
| `payroll.ts` | Payroll submissions |
| `user.ts` / `user-management.ts` | Profile and admin user updates |
| `home-registration.ts` | Geriatric home registration |
| `booking-requests.ts` | Home admin booking requests |

See the architecture doc for the complete categorized list.

## Database Schema

See [prisma/schema.prisma](prisma/schema.prisma) for the complete schema. Key models:

- **User** - Authentication and profile data
- **Event** - Booking scheduling and details (legacy internal model name)
- **Location** - Booking venues
- **EventAttendance** - RSVP and check-in tracking
- **TimeEntry** - Payroll time submissions
- **ExpenseRequest** - Expense/leave requests
- **Notification** - User notifications
- **GeriatricHome** - Care facility profiles
- **AuditLog** - System action logging
- **Invitation** - User invitation tokens

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## UI Standards

For consistent, professional UI across portals:

- **Tables**: follow `docs/TABLE_STANDARDS.md`
- **Shared styles**: use `lib/styles.ts` (`STYLES`)
- **Agent guidance**: see `AGENTS.md`

## Security Considerations

See [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) for a detailed security review.

**Before deploying to production:**
1. Change `AUTH_SECRET` to a secure random value
2. Confirm production `DATABASE_URL` and database backups
3. Implement actual email/SMS services
4. Add HTTPS enforcement
5. Review and fix identified security issues

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Submit a pull request

## License

Private - All rights reserved.
