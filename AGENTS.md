# Agent Instructions (Repo)

This repo uses consistent UI templates across the admin/staff/dashboard portals. When making UI changes, follow these rules so pages stay coherent and “merge-ready”.

## UI Standards (must-follow)

- **Use `STYLES`** from `lib/styles.ts` for buttons, inputs, badges, cards, and especially tables.
- **Tables must follow the lined-table standard** in `docs/TABLE_STANDARDS.md`:
  - Wrap in `bg-white rounded-lg border border-gray-200 overflow-hidden`
  - Use `table-scroll-wrapper` for sticky headers
  - Use `STYLES.tableHeadRow` + `STYLES.tableHeader` + `STYLES.tableCell` + `STYLES.tableRow`
- **Avoid ad-hoc table markup** (custom paddings/dividers/headers) unless you’re migrating toward the standard.

## Admin “detail page” layout conventions

For pages like `/admin/users/[id]`:

- Prefer **server-first rendering** with small client “islands” where necessary.
- Prefer **compact** information density: clear header, left-rail actions, and a right-side **tabbed** content area.
- Keep **data collection** unchanged unless explicitly requested (same fields and server actions).
- If a user has multiple roles, prefer `roleAssignments` for classification/visibility decisions.

## Docs

- **Architecture and feature inventory:** [docs/CODEBASE_ARCHITECTURE.md](docs/CODEBASE_ARCHITECTURE.md) (stack, data domains, routes by role, auth/middleware, server actions map).
- If you introduce a new UI convention, update `docs/TABLE_STANDARDS.md` and add a short pointer in `README.md`.

