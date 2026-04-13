# Table Standards

This document defines the canonical table implementation pattern for all pages across all roles in this application.

## Financials hub shell (filtered list pages)

Use this pattern when a page has **multiple major sections** and **exports/context** above the data:

Reference: [`app/admin/financials/FinancialsHubClient.tsx`](../app/admin/financials/FinancialsHubClient.tsx)

1. Optional top card (e.g. [`FinancialReportsPanel`](../app/admin/financials/FinancialReportsPanel.tsx) — exports / month picker).
2. Primary section tabs: [`TabNavigation`](../components/admin/shared/TabNavigation.tsx) (border-b strip, icons + optional counts).
3. Scroll region: `flex-1 min-h-0 overflow-auto` wrapping the active panel.
4. **Within each panel:** secondary **status** filters use [`LinedStatusTabs`](../components/ui/LinedStatusTabs.tsx) (not ad-hoc pills or gray segment controls). Examples: **Timesheets**, **Mileage**, **Requests & Expenses** under Financials.
5. **Tabular content:** [`DataTableShell`](../components/admin/shared/DataTableShell.tsx) — white card + optional toolbar row + `table-scroll-wrapper` + `<table className={STYLES.table}>`. Dense non-tabular lists (e.g. timesheet **card grid**) still use `LinedStatusTabs` above the content.

## Template Reference

Primary references (migrate new work toward these):

- **Status filter strip (lined tabs):** `components/ui/LinedStatusTabs.tsx` — **Financials → Timesheets** ([`TimesheetList.tsx`](../components/admin/financials/TimesheetList.tsx)), **Mileage** ([`MileageList.tsx`](../components/admin/financials/MileageList.tsx)), **Requests & Expenses** ([`ExpenseRequestList.tsx`](../components/admin/financials/ExpenseRequestList.tsx)).
- **Card + scroll + table slot:** `components/admin/shared/DataTableShell.tsx` — used by Mileage and Expense lists after the status strip.
- **Table with lined header row:** Every `<thead>` must use `<tr className={STYLES.tableHeadRow}>` plus `STYLES.tableHeader` on each `<th>` (see [`MileageList.tsx`](../components/admin/financials/MileageList.tsx), [`StickyTable`](../components/ui/StickyTable.tsx)).
- **Legacy / complex tables:** `components/admin/bookings/EventListTable.tsx` — align with `tableHeadRow` and dividers when touched.

## Migration backlog (incremental)

Prefer `LinedStatusTabs` + `DataTableShell` when **adding** status-filtered financial tables. For **existing** pages across admin, payroll, staff, and dashboard: ensure `STYLES.tableHeadRow` on header rows; replace one-off status **pill bars** with `LinedStatusTabs` when refactoring that screen (see grep for `STYLES.table` / `table-scroll-wrapper`).

## Admin detail pages

When a “detail page” (e.g. `/admin/users/[id]`) needs a compact, row-based section (roles, quick links, small audit-like summaries), render those sections using the same lined-table standard:

- Card wrapper: `bg-white rounded-lg border border-gray-200 overflow-hidden`
- Table wrapper: `table-scroll-wrapper` (use an appropriate max-height for the panel)
- Header band: `STYLES.tableHeadRow` + `STYLES.tableHeader`
- Body: `divide-y divide-gray-100` + `STYLES.tableRow` + `STYLES.tableCell`

## Standard Table Structure

### 1. Card Wrapper
```tsx
<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
```

### 2. Table Wrapper (with scroll and sticky headers)
```tsx
<div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
```

### 3. Table Element
```tsx
<table className={STYLES.table}>
```

### 4. Header Row (lined band)
```tsx
<thead className="bg-gray-50">
  <tr className={STYLES.tableHeadRow}>
    <th className={STYLES.tableHeader}>Column Header</th>
    ...
  </tr>
</thead>
```

### 5. Table Body with Rows
```tsx
<tbody className="divide-y divide-gray-100">
  {items.map(item => (
    <tr key={item.id} className={STYLES.tableRow}>
      <td className={STYLES.tableCell}>...</td>
      ...
    </tr>
  ))}
</tbody>
```

## Style Constants

All table styles are defined in `lib/styles.ts`:

```ts
STYLES.table         // Base table styles
STYLES.tableWrapper  // Card wrapper with scroll
STYLES.tableHeadRow  // `<tr>` in thead — strong bottom border (lined header)
STYLES.tableHeader   // Header cell styling
STYLES.tableCell     // Standard cell padding (px-4 py-3)
STYLES.tableRow      // Row with hover state
```

## Complete Example

```tsx
import { STYLES } from "@/lib/styles"
import { cn } from "@/lib/utils"

export function MyDataTable({ data }: { data: Item[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
        <table className={STYLES.table}>
          <thead className="bg-gray-50">
            <tr className={STYLES.tableHeadRow}>
              <th className={STYLES.tableHeader}>Name</th>
              <th className={STYLES.tableHeader}>Status</th>
              <th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(item => (
              <tr key={item.id} className={STYLES.tableRow}>
                <td className={STYLES.tableCell}>{item.name}</td>
                <td className={STYLES.tableCell}>
                  <StatusBadge status={item.status} />
                </td>
                <td className={cn(STYLES.tableCell, "text-right")}>
                  <ActionMenu itemId={item.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

## Reusable Components

For simple tables, use the `StickyTable` component from `components/ui/StickyTable.tsx`:

```tsx
import { StickyTable, TableRow, TableCell } from "@/components/ui/StickyTable"
import { STYLES } from "@/lib/styles"

<StickyTable headers={['Name', 'Status']}>
  {items.map(item => (
    <TableRow key={item.id}>
      <TableCell>{item.name}</TableCell>
      <TableCell>{item.status}</TableCell>
    </TableRow>
  ))}
</StickyTable>
```

## Mobile Responsive Design

For mobile views, implement a card-based layout alongside the table:

```tsx
<div className="md:hidden space-y-3">
  {items.map(item => (
    <MobileCard key={item.id} item={item} />
  ))}
</div>

<div className="hidden md:block">
  <StickyTable headers={[...]}>
    ...
  </StickyTable>
</div>
```

See `EventListTable.tsx` for a complete example of mobile + desktop views.

## Common Patterns

### Right-aligned Actions Column
```tsx
<th className={cn(STYLES.tableHeader, "text-right")}>Actions</th>
<td className={cn(STYLES.tableCell, "text-right")}>
  <ActionButtons />
</td>
```

### Status Badges
```tsx
<span className={cn(
  "inline-flex px-2 py-0.5 rounded text-xs font-medium",
  status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
)}>
  {status}
</span>
```

### Empty State
```tsx
<tr>
  <td colSpan={columns.length} className={cn(STYLES.tableCell, "text-center py-12")}>
    <EmptyStateIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
    <p className="text-sm text-gray-500">No items found</p>
  </td>
</tr>
```

## Anti-Patterns to Avoid

❌ **Don't use inconsistent cell padding:**
```tsx
// Wrong - inconsistent with template
<td className="px-6 py-4">

// Correct
<td className={STYLES.tableCell}>
```

❌ **Don't use inconsistent dividers:**
```tsx
// Wrong
<tbody className="divide-y divide-gray-200">

// Correct
<tbody className="divide-y divide-gray-100">
```

❌ **Don't skip the table wrapper:**
```tsx
// Wrong - headers won't stick on scroll
<table className={STYLES.table}>

// Correct
<div className="table-scroll-wrapper max-h-[calc(100vh-320px)]">
  <table className={STYLES.table}>
```

❌ **Don't use custom row hover:**
```tsx
// Wrong
<tr className="hover:bg-gray-50 transition-colors">

// Correct
<tr className={STYLES.tableRow}>
```

## Max Height Guidelines

| Context | Max Height |
|---------|------------|
| Standard tables | `max-h-[calc(100vh-320px)]` |
| Nested tables (modals) | `max-h-[400px]` |
| Full-page tables | `max-h-[calc(100vh-280px)]` |

Adjust as needed based on page layout, but maintain the `calc()` pattern.
