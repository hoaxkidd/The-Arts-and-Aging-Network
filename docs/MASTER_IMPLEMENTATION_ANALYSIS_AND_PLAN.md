# Master Implementation Analysis and Plan

This document is the execution plan for completing all pending tasks tracked in `docs/PENDING_TASKS_CHECKLIST.md` with efficient sequencing, dependency control, and strong validation coverage.

## 1) Scope Inventory (Do-Not-Miss List)

Pending work currently includes five major buckets:

1. Existing unchecked test scenarios (`TESTING_CHECKLIST.md`)
2. Explicit not-implemented and partially implemented features (`docs/CODEBASE_ANALYSIS.md`)
3. Backlog priorities (high/medium/low)
4. Messaging next steps (`docs/MESSAGING_FEATURES.md`)
5. New role-routing and back-navigation migration work (facilitator/board/volunteer alignment)

Primary constraint: this is not one feature but a portfolio. Efficient delivery requires phased execution and parallel workstreams.

## Current Delivery Status

Completed to date:

- Phase 0 baseline enablement (`test:coverage` enabled and passing)
- Phase 1 role-named routing migration (`/facilitator`, `/board`, `/volunteers`) with compatibility redirects
- Phase 2 back-navigation completeness across audited role pages
- High-priority backlog tranche completed (payroll export, monthly report, targeted notifications, inventory CRUD, employment admin UI, upload infrastructure, DM enforcement, email/SMS integration)
- Additional completed items: check-in -> timesheet auto-creation, donor CRUD UI, public testimonial submission/page

Remaining execution order is maintained in `docs/PENDING_TASKS_CHECKLIST.md` under **Section F: Remaining-Only Execution Queue (Ordered)**.

## 2) Current Baseline (Deep Test Readout)

Validation run results:

- `npm run test:run`: PASS (9 files, 154 tests)
- `npm run lint`: PASS
- `npm run build`: PASS (production build successful)
- `npm run test:coverage`: PASS

Implication: codebase is currently buildable and testable with coverage enabled.

## 3) Delivery Strategy

### Guiding principles

- Deliver in dependency order (platform and routing first, feature layers second)
- Maximize reuse (shared components, role-aware wrappers, minimal duplication)
- Keep compatibility while migrating (`/staff/*` legacy redirects)
- Ship with objective acceptance checks per phase

### Workstreams (parallelizable)

- Workstream A: Role-route architecture and redirects
- Workstream B: Back-navigation consistency across all role trees
- Workstream C: Communication/messaging hardening
- Workstream D: Payroll/reporting operational features
- Workstream E: Content and contact systems (training, branding, external contacts)

## 4) Phase Plan

## Phase 0 - Project hardening and instrumentation

Goals:

- Enable reliable deep validation and progress tracking.

Tasks:

- Add coverage dependency (`@vitest/coverage-v8`) and ensure `npm run test:coverage` works.
- Add CI workflow gates for `test:run`, `lint`, and `build`.
- Add a lightweight status dashboard in docs for phase completion.

Exit criteria:

- Coverage command succeeds.
- CI fails on regressions.

## Phase 1 - Role-named route migration (high priority)

Goals:

- Canonical role namespaces with deterministic redirects.

Tasks:

- Canonical route map:
  - ADMIN -> `/admin`
  - PAYROLL -> `/payroll`
  - HOME_ADMIN -> `/dashboard`
  - VOLUNTEER -> `/volunteers`
  - FACILITATOR -> `/facilitator`
  - BOARD -> `/board`
- Update role destination logic in `app/actions/auth.ts` and `app/page.tsx`.
- Create route trees for `/facilitator` and `/board` by reusing shared staff pages/components.
- Add compatibility redirects from `/staff/*` to role-specific routes based on session role.
- Keep route guard behavior secure and explicit per role namespace.

Exit criteria:

- Login lands each role in canonical route.
- Deep links to `/staff/*` still work via redirects.
- No route loops or unauthorized cross-access.

## Phase 2 - Back-navigation completeness (high priority)

Goals:

- Every detail/form subpage has a clear, role-correct back path.

Tasks:

- Fix all pages identified in checklist section E.
- Convert shared components with hardcoded `/staff/...` links to role-aware targets.
- Standardize back-link pattern and labels.
- Re-audit all route trees (`admin`, `dashboard`, `payroll`, `volunteers`, `facilitator`, `board`) for missing back UI.

Exit criteria:

- 100% of audited detail/subpages have back navigation.
- Mobile and desktop behavior verified.

## Phase 3 - Communication enforcement and reliability (high/medium)

Goals:

- Close messaging security/feature gaps.

Tasks:

- Enforce DM approval matrix in sending flow.
- Complete remaining messaging UX from `docs/MESSAGING_FEATURES.md` (context menu, reactions, edited badge, public join behavior).
- Add phone inquiry tracking workflows.
- Add post-event facilitator/volunteer feedback nudges.

Exit criteria:

- DM enforcement active and tested.
- Messaging feature parity complete.

## Phase 4 - Payroll and reporting capabilities (high)

Goals:

- Remove operational blockers for payroll/accounting.

Tasks:

- Payroll export and monthly report generation.
- Check-in to timesheet automation.
- Budget visibility dashboard.

Exit criteria:

- Payroll can export required periods and totals.
- Accounting workflows no longer manual-only.

## Phase 5 - Data systems and content hubs (medium/low)

Goals:

- Implement contact/training/branding/testimonial ecosystems.

Tasks:

- External contacts database (+ government/media lists)
- Training documentation and Q&A portal
- Branding assets hub
- Public testimonial submission and public testimonials page
- Newsletter archive integration

Exit criteria:

- Required data models, CRUD flows, and user-facing views delivered.

## 5) Efficiency Tactics

- Build role route trees with shared page composition rather than duplicated logic.
- Centralize route resolution utility (`getRoleBasePath`) and consume across nav/back components.
- Use feature flags for partially delivered modules to avoid long-lived branches.
- Keep migrations additive and backward compatible when possible.
- Bundle related schema changes per phase to reduce migration churn.

## 6) Test Strategy (Deep)

Automated layers per phase:

- Unit: role-route resolver, permission matrices, redirect guards
- Integration: messaging approval flow, request lifecycles, route redirects
- Build/lint/type gates: `npm run lint`, `npm run test:run`, `npm run build`
- Coverage: `npm run test:coverage` after dependency enablement

Manual/E2E layers:

- Role login redirect matrix (all roles)
- Route authorization matrix (allow/deny expectations)
- Back-button matrix across all role trees
- Core workflows: invitations, onboarding, requests, forms, messaging, payroll export

Test artifacts to maintain:

- Updated `TESTING_CHECKLIST.md` with canonical routes (`/facilitator`, `/board`, `/volunteers`)
- Per-phase run log with date, command output summary, and failures/fixes

## 7) Risk Register

- Redirect loops during `/staff/*` migration
- Shared component assumptions around `/staff` hardcoded links
- Role guard regressions causing over-permission or lockout
- Long-running feature queue causing stale branches

Mitigations:

- Redirect tests before rollout
- Shared route helper adoption early (Phase 1)
- Small, mergeable increments with strict CI

## 8) Execution Order Recommendation

Recommended order:

1. Phase 0 (validation tooling)
2. Phase 1 (role route migration)
3. Phase 2 (back-navigation completeness)
4. Phase 3 (messaging enforcement)
5. Phase 4 (payroll/reporting)
6. Phase 5 (data/content hubs)

This ordering minimizes rework and front-loads correctness-critical infrastructure.

## 9) Definition of Done for Entire Portfolio

All tasks are considered complete only when:

- Every checklist item in `docs/PENDING_TASKS_CHECKLIST.md` is either completed or explicitly cancelled with rationale.
- Canonical role routing and back navigation are consistent across all role trees.
- Automated deep checks pass (`test:run`, `lint`, `build`, and `test:coverage`).
- Manual role/access/back-navigation matrix is executed and documented.
