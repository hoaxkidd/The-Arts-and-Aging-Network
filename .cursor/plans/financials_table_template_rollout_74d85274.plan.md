---
name: Financials table template rollout
overview: "Apply the global lined table header (`STYLES.tableHeadRow` on every `<thead>` `<tr>`) across all app tables; then complete Financials-specific work (Timesheets table, Requests & Expenses unification, payroll history). MileageList is currently the only consumer of `tableHeadRow`—everything else uses plain `<tr>` under `bg-gray-50` thead."
todos:
  - id: global-lined-thead
    content: "Add STYLES.tableHeadRow to thead tr in all listed components/pages + StickyTable; verify tbody divide-y + table-scroll-wrapper where applicable"
    status: pending
  - id: timesheets-table
    content: "TimesheetList: replace card grid with STYLES table (LinedStatusTabs + columns for staff, week, hours, status, link/actions)"
    status: pending
  - id: expense-request-unify
    content: "ExpenseRequestList + payroll requests + RequestFilters: single bordered shell; toolbar row; LinedStatusTabs; table body (no separate filter card above card rows)"
    status: pending
  - id: payroll-timesheet-history-table
    content: "TimesheetHistoryList (payroll history tab) align to same table pattern instead of stacked cards"
    status: pending
  - id: docs-table-standards
    content: "Update docs/TABLE_STANDARDS.md — require tableHeadRow everywhere; table-first for dense lists"
    status: pending
  - id: optional-shared-table
    content: "Optional: ExpenseRequestTable dedupe after Financials tables land"
    status: pending
isProject: true
---

# Global table template: Financials Timesheets + hub subheader (revised)

## Global lined table style (new)

**Definition:** Per [`lib/styles.ts`](lib/styles.ts) and [`docs/TABLE_STANDARDS.md`](docs/TABLE_STANDARDS.md), every table with `<thead className="bg-gray-50">` must use a **lined header row**:

```tsx
<thead className="bg-gray-50">
  <tr className={STYLES.tableHeadRow}>
    <th className={STYLES.tableHeader}>...</th>
```

Today **only** [`components/admin/financials/MileageList.tsx`](components/admin/financials/MileageList.tsx) applies `tableHeadRow`. All other `<thead>` blocks use a bare `<tr>`, so the strong bottom border on the header band is missing.

**Mechanical pass:** Add `className={STYLES.tableHeadRow}` to the first `<tr>` inside each `<thead>` below. Keep `STYLES.tableHeader` on `<th>` (already sticky / uppercase). For nested or multi-row headers, apply `tableHeadRow` to the primary header `<tr>` (or each logical header row if design requires—prefer single row first).

**Inventory (search for `<thead` in `*.tsx`):**

| Area | File |
|------|------|
| Admin | [`app/admin/audit-log/page.tsx`](app/admin/audit-log/page.tsx), [`app/admin/communication/CommunicationHubClient.tsx`](app/admin/communication/CommunicationHubClient.tsx), [`app/admin/donors/DonorsHubClient.tsx`](app/admin/donors/DonorsHubClient.tsx), [`app/admin/email-reminders/page.tsx`](app/admin/email-reminders/page.tsx), [`app/admin/import/page.tsx`](app/admin/import/page.tsx) (thead uses `bg-yellow-50` for preview—still add `tableHeadRow` on `tr`), [`app/admin/inventory/InventoryHubClient.tsx`](app/admin/inventory/InventoryHubClient.tsx), [`app/admin/invitations/page.tsx`](app/admin/invitations/page.tsx), [`app/admin/payroll-forms/page.tsx`](app/admin/payroll-forms/page.tsx), [`app/admin/requests/page.tsx`](app/admin/requests/page.tsx) |
| Payroll | [`app/payroll/history/HistoryTabs.tsx`](app/payroll/history/HistoryTabs.tsx) |
| Components | [`components/admin/events/EventListTable.tsx`](components/admin/events/EventListTable.tsx), [`components/admin/financials/ExpenseRequestList.tsx`](components/admin/financials/ExpenseRequestList.tsx), [`components/admin/AdminFormSubmissionsList.tsx`](components/admin/AdminFormSubmissionsList.tsx), [`components/admin/HomeAdminsTable.tsx`](components/admin/HomeAdminsTable.tsx), [`components/admin/HomeList.tsx`](components/admin/HomeList.tsx), [`components/admin/HomeQuickView.tsx`](components/admin/HomeQuickView.tsx), [`components/admin/UsersTable.tsx`](components/admin/UsersTable.tsx), [`components/dashboard/HomeEventHistory.tsx`](components/dashboard/HomeEventHistory.tsx), [`components/event-requests/AdminRequestList.tsx`](components/event-requests/AdminRequestList.tsx), [`components/event-requests/RequestList.tsx`](components/event-requests/RequestList.tsx), [`components/settings/SettingsPage.tsx`](components/settings/SettingsPage.tsx) (two tables), [`components/staff/UpcomingBookingsTable.tsx`](components/staff/UpcomingBookingsTable.tsx), [`components/ui/StickyTable.tsx`](components/ui/StickyTable.tsx) (both thead instances—propagates to all `StickyTable` consumers) |

**Follow-up (optional, same PR or later):** Where a table sits in a plain fragment without [`table-scroll-wrapper`](docs/TABLE_STANDARDS.md) + card, add the wrapper when touching the file—do not block the `tableHeadRow` pass on full shell migration.

## New requirements (plan iteration)

1. **Timesheets (admin Financials):** Stop using the **card grid** in [`components/admin/financials/TimesheetList.tsx`](components/admin/financials/TimesheetList.tsx). Render the same information in a **proper HTML table** with [`LinedStatusTabs`](components/ui/LinedStatusTabs.tsx) above it, using `STYLES.table`, `table-scroll-wrapper`, `tableHeadRow` / `tableHeader` / `tableRow` / `tableCell`. Columns should expose the data that cards currently show (staff, week range, total hours, status, submitted date, navigation to `/admin/timesheets/[id]`, draft delete affordance in-row or actions column).

2. **Requests & Expenses — “cards as sub table headers”:** Fix layouts where a **filter card** or heavy filter strip sits above **stacked row cards**, which reads like a fake header + body.

   - **Admin Financials tab** — [`components/admin/financials/ExpenseRequestList.tsx`](components/admin/financials/ExpenseRequestList.tsx): Already uses a `<table>` for rows, but **quick filter buttons** are a separate block above the card. **Unify** into one white card: optional **toolbar row** (`border-b bg-gray-50/50`) + **`LinedStatusTabs`** for ALL / PENDING / APPROVED / REJECTED + `tableHeadRow` on `<thead><tr>`.

   - **Payroll — My Requests** — [`app/payroll/requests/page.tsx`](app/payroll/requests/page.tsx): [`RequestFilters`](components/RequestFilters.tsx) is a **separate bordered card** above a **list of `STYLES.card` rows** (lines 100–140). **Refactor** so filters live in a **toolbar inside the same table card** (or replace `RequestFilters` with `LinedStatusTabs` + optional selects in the toolbar row), and **request rows become `<tr>` cells** matching column semantics used in admin (type, details, amount, date, status). Preserve the **New Request** form column (`lg:col-span-1`) + **table** on the right (`lg:col-span-2`), or stack on mobile—goal is **no standalone filter card** acting as a sub-header above card rows.

   - **Admin standalone** — [`app/admin/requests/page.tsx`](app/admin/requests/page.tsx): Same table as Financials tab; **`tableHeadRow`** applied in the global thead pass above.

3. **Payroll history — Weekly timesheets:** [`components/payroll/TimesheetHistoryList.tsx`](components/payroll/TimesheetHistoryList.tsx) uses **stacked cards**. Align to the **same table pattern** as admin Timesheets (week, hours, entries count, status, link if applicable) for consistency across **roles/accounts** (payroll vs admin viewing similar data shapes).

4. **Shared code:** Extract a **`PayrollExpenseRequestTable`** or **`ExpenseRequestTable`** (server/client split as needed) used by **ExpenseRequestList**, **admin/requests**, and **payroll/requests** list region to avoid three divergent markups—only if duplication is high after the first pass.

5. **Documentation:** Update [`docs/TABLE_STANDARDS.md`](docs/TABLE_STANDARDS.md) to state **table-first** for dense financial lists; card grids reserved for marketing/sparse content, not primary admin queues.

## Hub shell (unchanged)

[`FinancialsHubClient`](app/admin/financials/FinancialsHubClient.tsx): `FinancialReportsPanel` + primary `TabNavigation` + scroll body.

## Testing

- `/admin/financials`: Timesheets, Mileage, Requests & Expenses — filters + table scroll + actions.
- `/payroll/requests` — form + table; filters do not duplicate as a separate header card.
- `/admin/requests` — thead styling + rows.
- `/payroll/history` — Weekly Timesheets tab table.

## Out of scope

- Changing Prisma models or server actions beyond what the UI needs for links/actions.
