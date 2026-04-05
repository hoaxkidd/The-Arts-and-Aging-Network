# Role Matrix QA Guide

This guide is the single source of truth for validating role behavior after multi-role support.

Quick helper command:

- `npm run qa:role-matrix` prints seeded accounts, expected landings, and QA links.

Policy constraints:

- Login redirects to **primary role** home.
- `BOARD` is **exclusive** (cannot be merged with any other role).

## Seeded QA Accounts

Run `npm run db:seed` before testing.

- `facvol@artsandaging.com` -> primary `FACILITATOR`, secondary `VOLUNTEER`
- `payvol@artsandaging.com` -> primary `PAYROLL`, secondary `VOLUNTEER`
- `boardonly@artsandaging.com` -> `BOARD` only
- Shared password: `TestPass123!`

## Expected Login Landing

- `FACILITATOR + VOLUNTEER` -> `/facilitator`
- `PAYROLL + VOLUNTEER` -> `/payroll`
- `BOARD` only -> `/board`

## Access Matrix

Legend: `Y` = access expected, `N` = access denied/redirected.

| Role Set | /facilitator | /volunteers | /payroll | /board | /staff/inbox |
|---|---:|---:|---:|---:|---:|
| FACILITATOR + VOLUNTEER | Y | Y* | N | N | Y |
| PAYROLL + VOLUNTEER | N | Y* | Y | N | Y |
| BOARD only | N | N | N | Y | Y |

`*` Volunteer routes require `volunteerReviewStatus = APPROVED`.

## Feature Expectations by Role Set

### FACILITATOR + VOLUNTEER

- Facilitator features available (staff events, directory, groups, inbox, forms).
- Volunteer features available (volunteer dashboard/forms).
- Role switch links visible in sidebar for facilitator and volunteer portals.
- Volunteer review status only gates volunteer routes (does not block facilitator routes).

### PAYROLL + VOLUNTEER

- Payroll features available (check-in, timesheet, mileage, payroll forms/requests/history).
- Volunteer features available (volunteer dashboard/forms).
- Role switch links visible for payroll and volunteer portals.
- Volunteer review status only gates volunteer routes (does not block payroll routes).

### BOARD only

- Board namespace access only.
- No merged-role behavior allowed.
- BOARD merge attempts must fail in admin role controls and invitation role assignment flow.

## Admin QA Workflow

Use `/admin/users/[id]` for each QA account.

1. Verify **Role Assignments** panel shows expected roles.
2. Verify **Primary** badge is correct.
3. Verify **Role Feature Quick Links** open expected portal routes.
4. For users with volunteer role, toggle `Volunteer Review Status` buttons and confirm:
   - `PENDING_REVIEW` and `REQUEST_CORRECTIONS` block volunteer routes.
   - `APPROVED` restores volunteer route access.
5. Attempt invalid role merges:
   - add `BOARD` to multi-role user -> must fail
   - add any role to board-only user -> must fail

## Regression Checks

Run after role-matrix QA:

- `npm run test:run`
- `npm run lint`
- `npm run build`
- `npm run test:coverage`

## Related Files

- `auth.ts`
- `middleware.ts`
- `app/actions/user.ts`
- `app/actions/invitation.ts`
- `components/DashboardLayoutClient.tsx`
- `app/admin/users/[id]/page.tsx`
- `lib/roles.ts`
- `prisma/seed.ts`
