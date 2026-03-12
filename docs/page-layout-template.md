# Portal Page Layout Template

Use this template for all authenticated pages (`/admin`, `/staff`, `/dashboard`, `/payroll`, `/volunteers`, `/notifications`).

Reference pages:
- `/admin/users`
- `/admin/inventory`
- `/staff/directory`

## Required Layout Rules

- Use the global shell padding from `DashboardLayoutClient` (`p-4 md:p-6`); do not add duplicate route-root horizontal padding.
- Prefer route root containers like `space-y-4` or `h-full flex flex-col`.
- Avoid route-root classes like `px-4 sm:px-6`, `p-6`, or `-mx-*` compensation hacks.
- Avoid in-page sticky white headers (`sticky ... bg-white ...`) and hardcoded offsets like `top-[73px]`.
- Use full width for list/table/detail pages; reserve narrow widths for focused form flows only.

## Recommended Class Tokens

Use shared tokens from `lib/styles.ts` when possible:
- `STYLES.pageTemplateRoot`
- `STYLES.pageTemplateHeader`
- `STYLES.pageTemplateSubHeader`

## Intentional Narrow Exceptions

Keep narrow layouts for these focused flows unless product requirements change:
- `/admin/events/[id]/edit`
- `/dashboard/events/[eventId]/sign-up`
- `/payroll/check-in`
- `/staff/groups/join/[id]`

## PR Checklist

- Matches spacing rhythm of `/admin/users`.
- No duplicate horizontal gutter at page root.
- No sticky white in-page header unless explicitly justified.
- No overlap between top bars, tabs, and content on desktop/mobile.
