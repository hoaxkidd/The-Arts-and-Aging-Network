# Security Audit Report

**Project:** Arts & Aging Admin Panel
**Date:** January 2026
**Auditor:** Automated Code Review

---

## Executive Summary

This security audit identified **26 issues** across the codebase, including 4 critical vulnerabilities that require immediate attention. The most severe issue is a broken authorization check that allows any authenticated user to escalate their privileges to ADMIN.

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 5 |
| Medium | 5 |
| Low | 6 |
| Data Leaks | 2 |
| Architecture | 4 |

---

## Critical Issues

### 1. Broken Authorization in `updateUser`

**File:** `app/actions/user.ts:58-82`
**Risk:** Privilege Escalation
**CVSS:** 9.8 (Critical)

**Description:**
The `updateUser` function only verifies that a user is logged in, but does not verify they have ADMIN privileges. Any authenticated user can update any other user's role, including promoting themselves to ADMIN.

**Current Code:**
```typescript
export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  // Missing ADMIN role check
}
```

**Recommended Fix:**
```typescript
export async function updateUser(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }
  if (session.user.role !== 'ADMIN') return { error: 'Unauthorized' }
  // ... rest of function
}
```

---

### 2. Suspended/Inactive Users Can Login

**File:** `auth.ts:19-24`
**Risk:** Access Control Bypass
**CVSS:** 8.1 (High)

**Description:**
The authentication flow does not check user status. Users with SUSPENDED or INACTIVE status can still authenticate and access the system.

**Current Code:**
```typescript
const user = await prisma.user.findUnique({ where: { email } })
if (!user) return null
if (!user.password) return null
// Missing status check
```

**Recommended Fix:**
```typescript
const user = await prisma.user.findUnique({ where: { email } })
if (!user) return null
if (!user.password) return null
if (user.status !== 'ACTIVE') return null
```

---

### 3. Missing Ownership Check in Delete Operations

**File:** `app/actions/engagement.ts:109-125`
**Risk:** Unauthorized Data Deletion
**CVSS:** 7.5 (High)

**Description:**
The `deleteComment` and `deletePhoto` functions only check for ADMIN/PAYROLL role but don't allow users to delete their own content. More critically, they don't verify that the comment/photo actually belongs to the event specified.

**Recommended Fix:**
```typescript
export async function deleteComment(commentId: string, eventId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const comment = await prisma.eventComment.findUnique({
    where: { id: commentId }
  })

  if (!comment) return { error: 'Comment not found' }

  // Allow deletion if user is owner OR admin/payroll
  const isOwner = comment.userId === session.user.id
  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'PAYROLL'

  if (!isOwner && !isAdmin) return { error: 'Unauthorized' }

  await prisma.eventComment.delete({ where: { id: commentId } })
  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
```

---

### 4. Rate Limit Memory Leak

**File:** `lib/rate-limit.ts`
**Risk:** Denial of Service
**CVSS:** 7.5 (High)

**Description:**
The rate limiter stores entries in a `Map` that is never cleaned up. Over time, this will cause memory exhaustion.

**Current Code:**
```typescript
const trackers = new Map<string, { count: number; expiresAt: number }>()
// Entries are never removed
```

**Recommended Fix:**
```typescript
const trackers = new Map<string, { count: number; expiresAt: number }>()

// Cleanup old entries periodically
function cleanup() {
  const now = Date.now()
  for (const [key, value] of trackers) {
    if (value.expiresAt < now) {
      trackers.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000)
```

---

## High Issues

### 5. No Rate Limiting on Public Registration

**File:** `app/actions/home-registration.ts`
**Risk:** Abuse / Spam

The home registration endpoint has no rate limiting, allowing automated account creation.

**Recommendation:** Add rate limiting similar to the login endpoint.

---

### 6. Check-in Time Validation Disabled

**File:** `app/actions/attendance.ts:25`
**Risk:** Data Integrity

The check-in time validation is commented out, allowing check-ins at any time.

**Recommendation:** Enable the validation or implement a configurable window.

---

### 7. Notification Model Missing User Relation

**File:** `prisma/schema.prisma:237-252`
**Risk:** Orphaned Data

The Notification model lacks a relation to User, preventing cascade deletes.

**Recommendation:** Add the relation:
```prisma
model Notification {
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ...
}
```

---

### 8. Inconsistent Password Hashing

**Files:** `app/actions/invitation.ts:113`, `app/actions/home-registration.ts:33`
**Risk:** Security Inconsistency

Password hashing uses different salt rounds (12 vs 10).

**Recommendation:** Standardize to 12 rounds across all files.

---

### 9. Missing HOME_ADMIN in Role Dropdown

**File:** `app/admin/users/[id]/page.tsx:70-77`
**Risk:** Functionality Gap

Admins cannot assign the HOME_ADMIN role through the UI.

**Recommendation:** Add HOME_ADMIN to the role select options.

---

## Medium Issues

### 10. XSS Risk with User Images

**File:** `app/admin/users/page.tsx:42-43`

Using `<img src={user.image}>` directly without sanitization.

**Recommendation:** Use Next.js `Image` component.

---

### 11. Invitation Token Exposed to Client

**File:** `app/actions/invitation.ts:65`

The invitation token is returned in the response and could be logged.

**Recommendation:** Store token securely and provide only a reference ID.

---

### 12. No Return Value in updateEventStatus

**File:** `app/actions/events.ts:202-208`

Function doesn't return success/error status.

---

### 13. No Event Status Validation

**File:** `app/actions/events.ts:206`

Any string is accepted as event status.

**Recommendation:** Validate against allowed values.

---

### 14. No Pagination

**File:** `app/admin/users/page.tsx:8-9`

All users are fetched without pagination.

**Recommendation:** Implement pagination for large datasets.

---

## Low Issues

### 15. Console Logs in Production

Multiple files contain `console.log` statements.

**Files affected:**
- `lib/notifications.ts`
- `app/actions/events.ts`
- `app/actions/home-registration.ts`

---

### 16. Weak Default AUTH_SECRET

**File:** `.env:2`

The default secret is predictable.

---

### 17. SQLite Not Production-Ready

**File:** `.env:1`

SQLite doesn't handle concurrent writes well.

---

### 18. No Input Length Limits

Text fields lack maximum length validation.

---

### 19. Missing Error Boundaries

No React error boundaries for graceful failure.

---

### 20. Hardcoded Magic Numbers

Values like 5MB, 7 days, 2 hours are hardcoded.

---

## Data Leak Concerns

### 21. Full User Objects in Queries

**File:** `app/events/[id]/page.tsx:21`

Queries include full user objects when only name/email needed.

---

### 22. Sensitive Data in Audit Logs

**File:** `app/actions/home-registration.ts:86-93`

Error stack traces are stored in audit logs.

---

## Architecture Improvements

### 23. Duplicate Notification Logic

Three notification functions share 80% identical code.

---

### 24. Missing Middleware for /dashboard

The middleware doesn't explicitly protect `/dashboard` routes.

---

### 25. Missing Database Indexes

Recommended indexes:
- `TimeEntry(userId, date)`
- `ExpenseRequest(userId, status)`
- `EventAttendance(status)`

---

### 26. No Soft Deletes

Users and events are hard deleted, losing audit trail.

---

## Remediation Priority

### Immediate (Before Production)
1. Fix `updateUser` authorization
2. Add user status check to login
3. Fix rate limit memory leak
4. Add rate limiting to registration

### Short-term (Within 1 Week)
5. Enable check-in validation
6. Add Notification-User relation
7. Standardize password hashing
8. Add HOME_ADMIN to role dropdown

### Medium-term (Within 1 Month)
9. Implement pagination
10. Add input length limits
11. Remove console.log statements
12. Use Next.js Image component

### Long-term (Ongoing)
13. Refactor notification code
14. Add database indexes
15. Implement soft deletes
16. Add error boundaries
