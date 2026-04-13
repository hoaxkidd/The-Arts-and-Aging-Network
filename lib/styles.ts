/**
 * TABLE STANDARDS - Canonical Table Implementation
 * 
 * All tables across all roles MUST follow this structure for consistency.
 * Template reference: /admin/bookings EventListTable
 * 
 * REQUIRED STRUCTURE:
 * 1. Card wrapper: bg-white rounded-lg border border-gray-200 overflow-hidden
 * 2. Table wrapper: table-scroll-wrapper with max-h-[calc(100vh-320px)]
 * 3. Table element: STYLES.table
 * 4. Header row: thead tr with STYLES.tableHeadRow; th cells use STYLES.tableHeader
 * 5. Body: divide-y divide-gray-100
 * 6. Rows: STYLES.tableRow (includes hover state)
 * 7. Cells: STYLES.tableCell (px-4 py-3)
 * 
 * OPTIONAL:
 * - Mobile card view for responsive design
 * - Search/filter controls above the table
 * 
 * For reusable table component, use StickyTable from components/ui/StickyTable.tsx
 */

export const STYLES = {
  // Buttons - Arts & Aging Brand
  btn: "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm",
  btnPrimary: "bg-primary-500 text-white hover:bg-primary-600 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2",
  btnSecondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2",
  btnAccent: "bg-secondary-400 text-primary-900 hover:bg-secondary-500 focus:ring-2 focus:ring-secondary-300 focus:ring-offset-2 font-semibold",
  btnDanger: "bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
  btnGhost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
  btnIcon: "p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors",
  /**
   * Pair with `btn` + `btnPrimary` / `btnSecondary` for horizontal toolbars (exports, paired actions).
   * Smaller type and padding below `sm` to avoid overflow on narrow viewports (all dashboard roles).
   */
  btnToolbar:
    "h-9 min-h-[2.25rem] min-w-0 justify-center px-2.5 py-0 text-xs sm:px-4 sm:text-sm",
  /** Lucide icons inside btnToolbar buttons */
  btnToolbarIcon: "h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4",

  // Inputs
  input: "block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-sm px-3 py-2 border bg-white placeholder:text-gray-400",
  select: "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-no-repeat bg-[right_0.5rem_center] pr-10",

  // Cards
  card: "bg-white rounded-lg border border-gray-200 p-5",
  cardHeader: "flex items-center justify-between pb-3 mb-3 border-b border-gray-100",
  cardTitle: "text-base font-semibold text-gray-900 flex items-center gap-2",

  // Badges
  badge: "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
  badgeSuccess: "bg-green-100 text-green-800 border border-green-200",
  badgeWarning: "bg-amber-100 text-amber-800 border border-amber-200",
  badgeDanger: "bg-red-100 text-red-800 border border-red-200",
  badgeInfo: "bg-blue-100 text-blue-800 border border-blue-200",
  badgeNeutral: "bg-gray-100 text-gray-700 border border-gray-200",

  // Page Headers
  pageHeader: "mb-8",
  pageTitle: "text-2xl font-bold text-gray-900 flex items-center gap-3",
  pageDescription: "text-gray-500 mt-1",
  pageIcon: "w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center",
  pageTemplateRoot: "space-y-4",
  pageTemplateHeader: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
  pageTemplateSubHeader: "pb-3 border-b border-gray-200",

  // Stats Cards
  statsCard: "bg-white rounded-lg border border-gray-200 p-4",
  statsIcon: "w-10 h-10 rounded-lg flex items-center justify-center",
  statsValue: "text-2xl font-bold text-gray-900",
  statsLabel: "text-sm font-medium text-gray-500",

  // Tables - See TABLE STANDARDS documentation above
  // IMPORTANT: Always wrap tables in .table-scroll-wrapper for sticky headers
  table: "w-full text-sm min-w-full",
  tableWrapper: "table-scroll-wrapper border border-gray-200 rounded-lg overflow-hidden bg-white",
  /** Use on `<thead><tr>` for a strong lined header band (global table template). */
  tableHeadRow: "border-b-2 border-gray-200",
  tableHeader: "sticky top-0 text-left text-xs font-bold text-gray-600 uppercase tracking-wider px-4 py-3 bg-gray-50 border-b border-gray-200",
  tableCell: "px-4 py-3 text-sm text-gray-600",
  tableRow: "border-b border-gray-100 hover:bg-gray-50 transition-colors",

  // Empty States
  emptyState: "flex flex-col items-center justify-center py-12 text-center",
  emptyIcon: "w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4",
  emptyTitle: "text-lg font-medium text-gray-900",
  emptyDescription: "text-gray-500 max-w-sm mx-auto mt-1"
}
