# Arts & Aging Admin Panel

A comprehensive volunteer management system for coordinating events, payroll, and geriatric home administration.

## Overview

This application provides role-based portals for managing:
- **Event Management** - Create, schedule, and track volunteer events
- **Payroll Tracking** - Time entries, expense requests, and approvals
- **Geriatric Home Management** - Self-registration and event coordination for care facilities
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
| SQLite | - | Development database |
| Zod | 4.3.5 | Schema validation |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up the database
npx prisma db push

# Seed initial data (optional)
npx prisma db seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secure-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

> **Important**: Change `AUTH_SECRET` to a secure random string in production.

## User Roles

| Role | Access | Description |
|------|--------|-------------|
| `ADMIN` | `/admin/*` | Full system access, user management, approvals |
| `PAYROLL` | `/payroll/*` | Time tracking, expense requests, event RSVP |
| `HOME_ADMIN` | `/dashboard/*` | Geriatric home management, event requests |
| `VOLUNTEER` | `/events/*` | Event viewing and RSVP |
| `CONTRACTOR` | `/events/*` | Event viewing and RSVP |
| `FACILITATOR` | `/events/*` | Event viewing and RSVP |
| `PARTNER` | `/events/*` | Event viewing and RSVP |
| `BOARD` | `/events/*` | Event viewing and RSVP |

## Project Structure

```
/app
  /(auth)/login        # Authentication pages
  /admin               # Admin portal (ADMIN only)
  /payroll             # Payroll portal (PAYROLL only)
  /dashboard           # Home admin portal (HOME_ADMIN only)
  /events              # Event pages (all authenticated users)
  /invite/[token]      # Invitation acceptance
  /register/home       # Geriatric home self-registration
  /actions             # Server actions (business logic)
  /api                 # API routes

/components
  /admin               # Admin-specific components
  /dashboard           # Home admin components
  /events              # Event-related components
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
  SECURITY_AUDIT.md    # Security review findings
  PAYROLL_USER_GUIDE.md # Payroll user documentation
```

## Key Features

### Authentication & Authorization
- Email/password login with bcrypt hashing
- JWT-based sessions
- Role-based route protection via middleware
- Rate limiting on login (5 attempts per minute)

### Event Management
- Create/edit/delete events with location management
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
- Event calendar specific to facility
- Staff contact directory

## API Routes

All business logic is implemented as Server Actions in `/app/actions/`:

| File | Functions |
|------|-----------|
| `auth.ts` | `authenticate` |
| `events.ts` | `createEvent`, `deleteEvent`, `updateEventStatus` |
| `attendance.ts` | `checkInToEvent`, `rsvpToEvent` |
| `engagement.ts` | `postComment`, `submitFeedback`, `uploadPhoto`, `deleteComment`, `deletePhoto` |
| `invitation.ts` | `createInvitation`, `acceptInvitation`, `cancelInvitation` |
| `payroll.ts` | `submitTimeEntry` |
| `requests.ts` | `submitRequest` |
| `admin.ts` | `updateRequestStatus` |
| `user.ts` | `updateUser`, `updateNotificationPreferences` |
| `home-registration.ts` | `registerGeriatricHome` |

## Database Schema

See [prisma/schema.prisma](prisma/schema.prisma) for the complete schema. Key models:

- **User** - Authentication and profile data
- **Event** - Event scheduling and details
- **Location** - Event venues
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

## Security Considerations

See [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) for a detailed security review.

**Before deploying to production:**
1. Change `AUTH_SECRET` to a secure random value
2. Switch from SQLite to PostgreSQL
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
# test
