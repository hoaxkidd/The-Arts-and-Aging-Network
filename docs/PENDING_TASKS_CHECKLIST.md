# Pending Tasks Checklist

This checklist consolidates pending work discovered across the repository and includes the newly requested routing/back-navigation work.

Current remaining snapshot:

- 55 unchecked items total
- 28 verification scenarios (Section A)
- 27 implementation backlog items (Sections B, C, D)

## A) Existing Unchecked Test Tasks
Source: `TESTING_CHECKLIST.md`

- [ ] 1.1 Admin create VOLUNTEER invite
- [ ] 1.2 Admin create FACILITATOR invite
- [ ] 1.3 Admin create HOME_ADMIN invite
- [ ] 1.4 Duplicate user invitation blocked
- [ ] 2.1 VOLUNTEER signup flow
- [ ] 2.2 FACILITATOR signup flow
- [ ] 2.3 HOME_ADMIN signup flow
- [ ] 2.4 Email change request
- [ ] 3.1 PENDING_REVIEW banner
- [ ] 3.2 Emergency contact fields visible
- [ ] 3.3 Skills pre-filled
- [ ] 3.4 Complete onboarding
- [ ] 3.5 Skip onboarding
- [ ] 4.1 Admin views pending volunteers
- [ ] 4.2 Admin approves volunteer
- [ ] 4.3 Admin requests corrections
- [ ] 5.1 Approved volunteer accesses portal
- [ ] 5.2 Unapproved volunteer blocked
- [ ] 5.3 Middleware blocks `/volunteers/forms`
- [ ] 5.4 Middleware blocks direct form fill
- [ ] 6.1 Volunteer submits form
- [ ] 6.2 Volunteer views submissions
- [ ] 7.1 Login redirects by role
- [ ] 7.2 Unauthorized routes blocked
- [ ] 8.1 Expired token rejected
- [ ] 8.2 Short password rejected
- [ ] 8.3 Duplicate email blocked
- [ ] 8.4 Skip limit enforced

## B) Explicitly Not Implemented / Partial Features
Source: `docs/CODEBASE_ANALYSIS.md`

- [ ] 2.1 Phone call and inquiry tracking
- [ ] 2.2 Facilitator feedback pop-ups
- [ ] 2.3 Facilitator program guides
- [ ] 2.4 Training documentation portal
- [ ] 2.5 External contacts database
- [ ] 2.6 Government officials and media lists
- [x] 2.7 Public testimonial submission
- [ ] 2.8 Newsletter integration
- [ ] 2.9 Branding assets hub
- [x] 2.10 DM approval enforcement (model exists, not enforced)
- [ ] 2.11 Budget visibility feature
- [ ] 2.12 SIN masked display and secure input UI (partially implemented)
- [ ] 2.13 Regional filtering and mention-based attention routing (partially implemented)

## C) Backlog Priorities
Source: `docs/CODEBASE_ANALYSIS.md`

### High Priority
- [x] Payroll export
- [x] Monthly expense report
- [x] Targeted event notifications
- [x] Inventory CRUD UI
- [x] Profile employment admin UI
- [x] Photo upload infrastructure
- [x] Calendar feed (iCal)
- [x] DM approval enforcement
- [x] Email service integration
- [x] SMS service integration

### Medium Priority
- [x] Dual role support
- [ ] Volunteer hour tracking
- [x] Board notification gating
- [ ] Home subscription model
- [ ] Testimonial auto-categorization
- [x] Staff event targeting
- [x] Check-in to timesheet auto-creation

### Low Priority
- [ ] Multi-funder split
- [ ] Event waitlist system
- [ ] Bulk admin actions
- [ ] Generic home login
- [x] Donor CRUD UI
- [x] Public testimonial page

## D) Messaging Feature Doc Next Steps
Source: `docs/MESSAGING_FEATURES.md`

- [ ] Run DB migration for message features
- [x] Build message context menu (edit/delete)
- [x] Build emoji picker for reactions
- [x] Add edited badge rendering
- [x] Add public group join button
- [x] Wire message actions/reactions into `ChatInterface`
- [ ] Optional: add user messaging preferences

## E) Newly Requested Role Routing and Back Navigation Work

- [x] Introduce role-named route namespaces for:
  - [x] `/facilitator`
  - [x] `/board`
  - [x] `/volunteers` consistency pass
- [x] Update auth and root redirects to canonical role paths
- [x] Add compatibility redirects from `/staff/*` to role-specific paths
- [x] Make shared navigation links role-aware
- [x] Add missing back buttons on identified detail/form subpages
- [x] Re-audit all role routes for missing back buttons:
  - [x] `admin`
  - [x] `dashboard`
  - [x] `payroll`
  - [x] `volunteers`
  - [x] `facilitator`
  - [x] `board`
- [x] Validate mobile and desktop back navigation behavior

## F) Remaining-Only Execution Queue (Ordered)

1. QA baseline synchronization (docs/checklists updated to canonical role routes and latest test totals)
2. Messaging completion pack (migration, edit/delete, reactions, edited badges, public join, ChatInterface wiring)
3. Board notification gating (approval workflow + audit trail)
4. Dual role support (schema/session/guard/menu updates with compatibility)
5. Volunteer hour tracking (capture + reporting)
6. Testimonial and engagement enhancements (auto-categorization + facilitator feedback + guides)
7. Operations/data systems (phone inquiries, contacts DB, government/media lists, mention routing)
8. Partner/home experience (home subscription model + generic home login)
9. Compliance/security enhancements (SIN handling + budget visibility + branding/newsletter/training)
10. Remaining low-priority finance/admin enhancements (multi-funder split, waitlist, bulk actions)
11. Full scenario closure (execute and check off all Section A / `TESTING_CHECKLIST.md` items)

## Notes

- No active `TODO/FIXME/HACK/XXX` comment markers were found in code files during this pass.
- Messaging feature schema (`DirectMessage.editedAt`, `GroupMessage.editedAt`, `MessageReaction`) exists in the live database. `prisma migrate dev` currently fails due legacy migration history (`P3006` on shadow DB), so migration task remains open for migration-chain cleanup.
- Multi-role support now uses role assignments with primary-role login routing and BOARD exclusivity (no merged BOARD roles allowed).

## Validation Baseline (Current)

Executed on current implementation:

- `npm run test:run` -> PASS (9 files, 154 tests)
- `npm run lint` -> PASS
- `npm run build` -> PASS (Next.js production build successful)
- `npm run test:coverage` -> PASS (coverage enabled via `@vitest/coverage-v8`)
