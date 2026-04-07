---
name: Mileage stats and header
overview: "Inline Mileage stat chips with month/year labeling; polish dashboard header; tighten Financial Exports controls (month picker + CSV/report buttons) for consistent size and styling."
todos:
  - id: mileage-inline-stats
    content: "Refactor MileageStats: horizontal layout per chip; month/year filter + month name label"
    status: pending
  - id: header-layout
    content: "DashboardLayoutClient: subtitle visible on mobile; items-start alignment for header block"
    status: pending
  - id: financial-exports-controls
    content: "FinancialReportsPanel: align month input + buttons (height, STYLES.input, button variants)"
    status: pending
isProject: true
---

# Mileage inline stats, named month, header polish, exports UI

## 1. Inline stats in [`components/admin/financials/MileageStats.tsx`](components/admin/financials/MileageStats.tsx)

- Restructure each of the four stat blocks so content is **horizontal**, not stacked (single compact row per chip).
- **Month/year filter:** sum entries where both `getFullYear()` and `getMonth()` match the current calendar month (fix year bug).
- **Label:** use localized month + year for the monthly chip title (e.g. April 2026).

## 2. Header display in [`components/DashboardLayoutClient.tsx`](components/DashboardLayoutClient.tsx)

- Show subtitle on all breakpoints (`text-sm` on small screens); consider `items-start` / `line-clamp-2` for long copy.

## 3. Financial Exports controls in [`app/admin/financials/FinancialReportsPanel.tsx`](app/admin/financials/FinancialReportsPanel.tsx)

**Goal:** One visual row of controls with **consistent height**, spacing, and tokens (match table/toolbar patterns elsewhere).

- **Month picker:** Use [`STYLES.input`](lib/styles.ts) (or shared input classes) for `type="month"` so border/focus ring match the app. Set explicit **`h-9`** (or `min-h-[2.25rem]`) to align with buttons. Label: stack “Month” above the input or use `flex items-center gap-2` with readable `text-xs font-medium text-gray-600` — avoid awkward `ml-2` inline label if it breaks alignment.
- **Export Payroll CSV (primary):** Match height to month input (`h-9`, `px-3`, `text-sm`), keep icon + label; ensure disabled state matches.
- **Monthly Expense Report (secondary):** Same **height** as primary; use outline style consistent with other secondary actions (`STYLES.btnSecondary` pattern if applicable, or `border border-gray-300 h-9`).
- **Layout:** `flex flex-wrap items-center gap-2 sm:gap-3` on the control group so month + both buttons sit on one line on `sm+` when space allows; wrap gracefully on narrow screens.
- Optional: reduce outer card padding slightly (`p-3`) if the row still feels bulky.

## 4. Verification

- `/admin/financials`: exports row aligns; buttons same height as month field; no misaligned baselines.
- Mileage tab: stats + header checks from main plan.
