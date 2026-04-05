# Complete Codebase Audit Report

> Generated: 2026-04-04
> Project: Arts & Aging Dashboard

---

## Table of Contents

1. [Styling Inconsistencies](#1-styling-inconsistencies)
2. [Table Issues](#2-table-issues)
3. [Table Overflow & Sizing](#3-table-overflow--sizing)
4. [Table Header Spacing](#4-table-header-spacing)
5. [Card & Dashboard Card Issues](#5-card--dashboard-card-issues)
6. [Dropdown Button Issues](#6-dropdown-button-issues)
7. [Broken Links & Missing Routes](#7-broken-links--missing-routes)
8. [Orphaned Pages](#8-orphaned-pages)
9. [Missing Navigation Buttons](#9-missing-navigation-buttons)
10. [General Styling Issues](#10-general-styling-issues)

---

## 1. Styling Inconsistencies

### 1.1 Unused Dependency
- **`class-variance-authority`** is installed in `package.json` but **zero** `cva()` calls exist anywhere in the codebase.

### 1.2 Duplicate `minWidth: 1294px` (4 places)
| Location | Code |
|---|---|
| `app/globals.css:5` | `html { min-width: 1294px !important; }` |
| `app/globals.css:9` | `body { min-width: 1294px; }` |
| `app/layout.tsx:34` | `style={{ minWidth: '1294px' }}` |
| Viewport meta | `width: 1294` |

### 1.3 Duplicate `--background` Declaration
- `app/globals.css:56` — `--color-background: #FAFBFC` (in `@theme`)
- `app/globals.css:60` — `--background: #FAFBFC` (in `:root`)

### 1.4 Hardcoded vs. Token Colors
| File | Issue |
|---|---|
| `components/admin/financials/MileageStats.tsx:43` | `style={{ width: '60%' }}` hardcoded |
| `components/admin/HomeList.tsx:35` | `getCapacityColor()` returns raw Tailwind classes (`bg-red-500`, `bg-yellow-500`, `bg-green-500`) |
| `app/admin/donors/DonorsHubClient.tsx:58` | `TIER_STYLES` uses raw Tailwind colors (`bg-purple-100`, `bg-blue-100`) |
| `components/DashboardLayoutClient.tsx:400-403` | Role portal colors hardcoded inline |

### 1.5 Button Styling Inconsistencies
- **Canonical**: `cn(STYLES.btn, STYLES.btnPrimary)`
- **Hardcoded variants found**:
  - `app/admin/broadcasts/page.tsx` — `bg-primary-600 text-white rounded-lg hover:bg-primary-700` (uses `primary-600`, not `primary-500`)
  - `app/admin/donors/DonorsHubClient.tsx` — `bg-primary-600 rounded-lg hover:bg-primary-700`
  - `components/settings/SettingsPage.tsx` — duplicates `STYLES.btnPrimary` inline
  - `app/payroll/requests/page.tsx` — `bg-secondary-600` (not using `STYLES.btnAccent`)

---

## 2. Table Issues

### 2.1 Style Definition Mismatch (`lib/styles.ts`)
```ts
tableHeader: "px-3 py-2.5"   // Header padding
tableCell:   "px-4 py-3"     // Body padding
```
Header cells are narrower horizontally and shorter vertically than body cells.

### 2.2 Missing `table-scroll-wrapper` (3 files)
| File | Issue |
|---|---|
| `components/admin/AdminFormSubmissionsList.tsx` | Table is direct child of card, no scroll wrapper |
| `app/admin/requests/page.tsx` | Uses `STYLES.card` with `overflow-hidden` but no scroll wrapper |
| `app/admin/payroll-forms/page.tsx` | Table is direct child of scroll wrapper, no card wrapper |

### 2.3 Missing Card Wrapper (2 files)
| File | Issue |
|---|---|
| `components/admin/financials/MileageList.tsx` | No outer `bg-white rounded-lg border border-gray-200` div |
| `app/admin/payroll-forms/page.tsx` | No outer card div |

### 2.4 Inline Padding Instead of `STYLES.tableCell`
- `components/admin/events/EventListTable.tsx` (lines 189, 202, 213, 224, 227) — hardcodes `px-4 py-3` despite being the "canonical reference"

### 2.5 Non-Standard Tables (Completely Ignore `STYLES`)
| File | Issues |
|---|---|
| `components/admin/HomeQuickView.tsx` | Uses `py-3 px-4` (reversed), `bg-gray-50/80`, `hover:bg-gray-50/50`, `w-full` (not `STYLES.table`) |
| `app/admin/import/page.tsx` | Uses `pb-2 font-medium`, `py-1.5`, `border-t border-yellow-200`, no scroll wrapper, no `divide-y` |

### 2.6 `StickyTableHead` Sub-Component Inconsistency
- `components/ui/StickyTable.tsx:106` — Uses plain `overflow-x-auto` instead of `table-scroll-wrapper` (no sticky headers, no max-height)

### 2.7 Redundant className on `StickyTable` Usage (4 files)
| File | Redundant className |
|---|---|
| `app/volunteers/forms/page.tsx` | `className="bg-white rounded-lg border border-gray-200"` |
| `app/dashboard/forms/page.tsx` | `className="bg-white rounded-lg border border-gray-200"` |
| `app/staff/forms/page.tsx` | `className="bg-white rounded-lg border border-gray-200"` |
| `app/payroll/forms/page.tsx` | `className="bg-white rounded-lg border border-gray-200"` |

### 2.8 Empty Row Styling Inconsistencies
| Pattern | Files |
|---|---|
| `cn(STYLES.tableCell, "text-center py-12")` | Most files (standard) |
| `px-6 py-8 text-center text-gray-500` | `app/admin/invitations/page.tsx` |
| `${STYLES.tableCell} text-center` (no py) | `app/admin/requests/page.tsx` |

### 2.9 className Concatenation Style
| Pattern | Files |
|---|---|
| `cn(STYLES.tableHeader, "text-right")` (recommended) | Most files |
| Template literal: `${STYLES.tableHeader} text-right` | DonorsHub, InventoryHub |

---

## 3. Table Overflow & Sizing

### 3.1 Five Different `max-h` Values
| Value | Files |
|---|---|
| `max-h-[calc(100vh-320px)]` | **Standard** — EventListTable, UpcomingBookingsTable, HomeEventHistory, UsersTable, AdminRequestList, RequestList, ExpenseRequestList, CommunicationHub, MileageList |
| `max-h-[calc(100vh-340px)]` | HomeAdminsTable |
| `max-h-[calc(100vh-360px)]` | DonorsHub, InventoryHub |
| `max-h-[calc(100vh-400px)]` | Invitations |
| `max-h-[calc(100vh-420px)]` | EmailReminders |

### 3.2 Column Sizing Inconsistencies
- `app/admin/audit-log/page.tsx` — Uses hardcoded `w-[20%]`, `w-[40%]` on `<th>` elements
- Most other tables rely on content-based sizing (no explicit widths)

---

## 4. Table Header Spacing

| Property | `STYLES.tableHeader` | `STYLES.tableCell` |
|---|---|---|
| Horizontal padding | `px-3` (24px total) | `px-4` (32px total) |
| Vertical padding | `py-2.5` (20px total) | `py-3` (24px total) |

### Deviations from Standard
| File | Header Padding Used |
|---|---|
| `components/admin/HomeQuickView.tsx` | `py-3 px-4` (reversed order) |
| `app/admin/import/page.tsx` | `pb-2` only (no horizontal padding) |
| `app/admin/audit-log/page.tsx` | Uses percentage widths on `<th>` |

---

## 5. Card & Dashboard Card Issues

### 5.1 Border Color Variations
| Border Class | Files |
|---|---|
| `border-gray-200` (standard) | Most files |
| `border-gray-100` | LocationCard.tsx, EventList.tsx |
| `border-yellow-200` | email-reminders/page.tsx |
| `border-green-200` | email-reminders/page.tsx |
| `border-red-200` | email-reminders/page.tsx |
| `border-blue-200` | volunteers/forms/page.tsx |
| `border-amber-200/80` | HomeQuickView.tsx |
| `border-red-200/80` | HomeQuickView.tsx |

### 5.2 Padding Variations
| Padding | Where Used |
|---|---|
| `p-5` (standard card) | `STYLES.card` |
| `p-4` (standard stat) | `STYLES.statsCard`, most stat cards |
| `p-3` | staff/page.tsx, payroll/page.tsx stat cards |
| `p-2` | dashboard/page.tsx compact stats |
| `p-6` | SettingsPage.tsx, testimonials |
| `p-8` / `p-12` | Empty states |

### 5.3 Border Radius Variations
| Radius | Where Used |
|---|---|
| `rounded-lg` (standard) | Most cards |
| `rounded-xl` | dashboard/page.tsx stats, CommunicationHubClient, many modals |
| `rounded-2xl` | HomeDetailsClient modals, HomeCalendarView modals |
| `rounded-md` | StaffDirectoryCard |

### 5.4 Five Different Stat Card Layouts
| Pattern | Layout | Files |
|---|---|---|
| A | Icon on top, value below | admin/page.tsx, DashboardStats.tsx |
| B | Horizontal inline, icon left | staff/page.tsx, payroll/page.tsx |
| C | Icon right, value left | email-reminders/page.tsx |
| D | Compact horizontal, all in one row | dashboard/page.tsx |
| E | No icon, text only | MileageStats.tsx, StaffScheduleView.tsx |

### 5.5 Four Different Card Header Patterns
| Pattern | Style | Files |
|---|---|---|
| A | Gray bg + `border-b` | Most dashboards |
| B | Gradient header | LocationCard.tsx |
| C | No header, just padding | MileageStats, StaffScheduleView |
| D | `STYLES.cardHeader` | Defined but rarely used |

### 5.6 Grid Gap Inconsistencies
| Gap | Where Used |
|---|---|
| `gap-2` | dashboard/page.tsx, staff/page.tsx, payroll/page.tsx |
| `gap-3` | admin/page.tsx, staff/page.tsx quick actions |
| `gap-4` | Most common (volunteers, forms pages, TimesheetList) |
| `gap-5` | HomeDetailsClient.tsx |
| `gap-6` | DashboardStats.tsx, EventList.tsx, dashboard/page.tsx main grid |

### 5.7 Shadow Inconsistencies
| Shadow | Where Used |
|---|---|
| None (border only, standard) | Most cards |
| `shadow-sm` | testimonials, events/[id]/page.tsx, HomeEventHistory.tsx |
| `shadow-md` | EventList.tsx buttons |
| `shadow-lg` | Date/time pickers, dropdowns |
| `shadow-xl` | Modals |
| `shadow-2xl` | Large modals |

### 5.8 Three Different Quick Action Card Designs
| File | Design |
|---|---|
| admin/page.tsx | 6 items, gradient bg, `w-10 h-10` icons, centered |
| payroll/page.tsx | 4 items, gradient bg, `w-9 h-9` icons |
| staff/page.tsx | 2 items, horizontal layout with arrow |

---

## 6. Dropdown Button Issues

### 6.1 Backdrop / Click-Away Strategy (MAJOR)
| Pattern | Files |
|---|---|
| `fixed inset-0 z-10` overlay | NotificationBell, ChatInterface, EventEngagement, EventCommunityTabs, AddToCalendar, MessageReactions |
| `mousedown` event listener | DateInput, DateTimeInput |
| CSS `group-hover:block` only | EmailTemplatesTab (no click-away, disappears on mouse leave) |
| No click-away at all | EventCommunityTabs emoji picker, MessageThread members panel |

### 6.2 Z-Index Inconsistencies
| z-value | Usage |
|---|---|
| `z-10` | Backdrop overlays |
| `z-20` | Most dropdown panels |
| `z-30` | EventCommunityTabs emoji picker |
| `z-40` | NotificationBell backdrop |
| `z-50` | NotificationBell panel, DateInput, DateTimeInput, EmailTemplatesTab |

### 6.3 Animation Inconsistencies
| Animation | Files |
|---|---|
| `animate-in fade-in slide-in-from-top-2 duration-200` | NotificationBell |
| `animate-in fade-in zoom-in-95 duration-200 origin-top-right` | AddToCalendar |
| **No animation** | All other dropdowns (ChatInterface, EventEngagement, EventCommunityTabs, DateInput, DateTimeInput, MessageReactions, EmailTemplatesTab) |

### 6.4 Dropdown Width Inconsistencies
| Width | Files |
|---|---|
| `w-28` | EventCommunityTabs comment menu |
| `w-32` | EventEngagement comment menu, ChatInterface message menu |
| `w-40` | ChatInterface message menu |
| `w-56` | AddToCalendar |
| `w-64` | EmailTemplatesTab variables |
| `w-72` | DateInput, DateTimeInput calendars |
| `w-[380px]` | NotificationBell |

### 6.5 Shadow Style Inconsistencies
| Shadow | Files |
|---|---|
| `shadow-lg` | ChatInterface, EventEngagement, EventCommunityTabs, DateInput, DateTimeInput, EmailTemplatesTab |
| `shadow-xl` | AddToCalendar, MessageReactions |
| `shadow-2xl` | NotificationBell |

### 6.6 Border Style Inconsistencies
| Border | Files |
|---|---|
| `border border-gray-200` | Most dropdowns |
| `border border-gray-100` | AddToCalendar |
| `ring-1 ring-black/5` (extra) | AddToCalendar |

### 6.7 ChevronDown Rotation Inconsistencies
| Pattern | Files |
|---|---|
| `rotate-180` on open | AddToCalendar |
| Icon swap (ChevronUp/ChevronDown) | FormTemplateBuilder |
| Static icon | FormTemplateFilters |

### 6.8 No React Portal Usage
All dropdowns use `absolute` within `relative` containers — they can be clipped by parent `overflow: hidden` elements.

### 6.9 No Third-Party Dropdown Library
Every dropdown is hand-rolled. No Radix UI, Headless UI, or shadcn/ui dropdown components are used.

---

## 7. Broken Links & Missing Routes

### HIGH Severity (Will cause 404 or redirect loops)

| Broken Link | Referenced From | Problem |
|---|---|---|
| `/volunteers/onboarding` | `app/volunteers/layout.tsx`, `app/volunteers/page.tsx`, `middleware.ts`, `lib/onboarding.ts` | No page file exists. `redirect()` calls will cause redirect loops before middleware rewrite can intercept. |
| `/volunteers/my-events` | `lib/menu.ts` (volunteerMenu "My Schedule") | No page file exists. No middleware rewrite rule for this path. Volunteers clicking "My Schedule" get 404. |
| `/payroll/expenses` | `components/DashboardLayoutClient.tsx` (PAGE_TITLES, PAGE_ICONS, PAGE_SUBTITLES), `lib/email/templates/defaults.ts` | No page file exists. Layout has full metadata for it, email templates link to it, but page doesn't exist. |

### MEDIUM Severity (Will cause 404 for specific user flows)

| Broken Link | Referenced From | Problem |
|---|---|---|
| `/staff/groups/new` | `components/messaging/MessagingCenter.tsx` | No page file exists. Only `app/staff/groups/page.tsx`, `[id]/page.tsx`, and `join/[id]/page.tsx` exist. |
| `/messages` | `lib/email/templates/defaults.ts` | No page file exists. Should be `/staff/inbox`. |

### LOW Severity (Work via middleware rewrite but fragile)

| Route | Referenced From | Problem |
|---|---|---|
| `/facilitator/*` (all routes) | `lib/menu.ts` (facilitatorMenu) | No physical pages. All rely on middleware rewrite to `/staff/*`. |
| `/board/*` (all routes) | `lib/menu.ts` (boardMenu) | No physical pages. All rely on middleware rewrite to `/staff/*`. |
| `/facilitator/onboarding` | `lib/onboarding.ts` | No physical page. Relies on middleware rewrite to `/staff/onboarding`. |

---

## 8. Orphaned Pages

Pages that exist as `page.tsx` files but have **no menu navigation** and **no inbound `<Link>` or button** from other pages:

| Page | Path | Notes |
|---|---|---|
| Admin Broadcasts | `/admin/broadcasts` | Registered in DashboardLayoutClient but no menu item, no inbound links |
| Admin Volunteers | `/admin/volunteers` | Page exists with server actions but no menu item, no inbound links |
| Admin Conversation Requests | `/admin/conversation-requests` | Registered in DashboardLayoutClient but no menu item, no inbound links |
| Admin Requests | `/admin/requests` | Registered in DashboardLayoutClient but no menu item, no inbound `<Link>` |
| Admin Email Reminders | `/admin/email-reminders` | Registered in DashboardLayoutClient but no menu item, no inbound links |
| Admin Import | `/admin/import` | Registered in DashboardLayoutClient but no menu item, no inbound links |
| Admin Form Templates | `/admin/form-templates` | Page exists with new/edit sub-pages but no menu item. Admin uses `/admin/forms?tab=templates` instead |
| Admin Form Submissions | `/admin/form-submissions` | No menu item. Only accessed via `router.push` from AdminFormSubmissionsList |
| Admin Payroll Forms | `/admin/payroll-forms` | No menu item in adminMenu, no inbound `<Link>` |
| Dashboard Engagement | `/dashboard/engagement` | Registered in DashboardLayoutClient but no menu item, no inbound links |
| Dashboard Calendar | `/dashboard/calendar` | Registered in DashboardLayoutClient but no menu item. Home admin menu has `/dashboard/events` instead |
| Payroll Schedule | `/payroll/schedule` | Registered in DashboardLayoutClient but no menu item in payroll menu |

---

## 9. Missing Navigation Buttons

### 9.1 Admin Menu Missing Links To:
- `/admin/broadcasts`
- `/admin/volunteers`
- `/admin/conversation-requests`
- `/admin/requests`
- `/admin/email-reminders`
- `/admin/import`
- `/admin/form-templates`
- `/admin/form-submissions`
- `/admin/payroll-forms`

These pages exist and are registered in `DashboardLayoutClient` PAGE_TITLES/PAGE_ICONS, but `adminMenu` in `lib/menu.ts` does not include them.

### 9.2 Home Admin Menu Missing Links To:
- `/dashboard/engagement`
- `/dashboard/calendar`

### 9.3 Payroll Menu Missing Link To:
- `/payroll/schedule`

### 9.4 Volunteer Menu Links to Non-Existent Page:
- `/volunteers/my-events` — listed as "My Schedule" but page doesn't exist

### 9.5 No Navigation to `/admin/users/new`:
- Only accessible via `AdminPeopleHomesTabs` component button on `/admin/users`

---

## 10. General Styling Issues

### 10.1 Inline Styles (14 instances)
| File | Line | Pattern |
|---|---|---|
| `components/DashboardLayoutClient.tsx` | 524 | `style={{ touchAction: 'none' }}` |
| `components/staff/ProfileForm.tsx` | 231, 361 | `style={{ maxHeight: '85vh', overflowY: 'auto' }}` |
| `components/staff/ProfileForm.tsx` | 499 | `style={{ display: ... }}` (conditional display) |
| `components/messaging/MessageThread.tsx` | 372 | `style={{ maxHeight: '120px' }}` |
| `components/messaging/TypingIndicator.tsx` | 73-75 | `style={{ animationDelay: '0ms'/'150ms'/'300ms' }}` |
| `components/messaging/RichTextEditor.tsx` | 163 | `style={{ minHeight }}` (dynamic prop) |
| `components/admin/HomeList.tsx` | 80, 146 | `style={{ width: \`${capacityPercent}%\` }}` (dynamic progress bar) |
| `components/admin/financials/MileageStats.tsx` | 43 | `style={{ width: '60%' }}` (hardcoded) |
| `app/layout.tsx` | 34 | `style={{ minWidth: '1294px' }}` |
| `app/admin/audit-log/AuditLogDetailsCell.tsx` | 77-80 | `style={{ left, top, transform }}` (tooltip positioning) |

### 10.2 Local Style Maps (Should Use `STYLES`)
| File | Pattern |
|---|---|
| `TIER_STYLES` in DonorsHubClient.tsx | `bg-purple-100 text-purple-700` etc. |
| `getCapacityColor()` in HomeList.tsx | `bg-red-500`, `bg-yellow-500`, `bg-green-500` |
| Role portal colors in DashboardLayoutClient.tsx | `bg-secondary-400`, `bg-accent-400`, etc. |

### 10.3 `tbody` Divider Color
- Standard: `divide-y divide-gray-100` (all files compliant)
- `STYLES.table` defines `divide-y divide-gray-200` — conflicts with the `tbody` standard

### 10.4 Syntax Error
- `app/admin/payroll-forms/page.tsx:174` — `form && "bg-purple-100 text-purple-800"` appears to be broken/malformed code

---

## Summary Statistics

| Category | Count |
|---|---|
| Total styling inconsistencies | 40+ |
| Tables missing `table-scroll-wrapper` | 3 |
| Tables missing card wrapper | 2 |
| Distinct `max-h` values | 5 |
| Stat card layout patterns | 5 |
| Card header patterns | 4 |
| Dropdown backdrop strategies | 4 |
| Dropdown width values | 7 |
| HIGH severity broken links | 3 |
| MEDIUM severity broken links | 2 |
| LOW severity broken links | 3 |
| Orphaned pages | 12 |
| Missing menu links | 13 |
| Inline style instances | 14 |
| Files with non-standard tables | 2 |
| Files using `StickyTable` component | 4 |
| Files using raw HTML tables with `STYLES` | 18 |
