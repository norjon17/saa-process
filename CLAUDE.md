# SAA Process — project instructions for Claude

## What this is
Web app for the Western Digital SAA (HGA static-attitude-adjust) process team in the Philippines. It replaces three Excel
workflows and a single-file HTML dashboard:
1. **Endorsement log** — per date + shift (DS/NS) issue hand-off rows per tool.
2. **Meancheck verdict** — upload the 3 CSVs of a lot → 24 checks → PASSED/FAILED (logic verified against the Excel template).
3. **1st Meancheck daily grid** — per tool × day status cells (P/F Auto/Man, IDLE, MB) with derived Overall.
Plus PM Status (monthly per tool), minor tabs (Low Cpk, Circuit Burn, Contact Chip, FIT OCAP, Weekly OOC) and Admin.

Source documents (read-only, never modify): `D:\Workstation\evalice\docs`. Seed data is extracted from them once into
`database/seed/` by the Python scripts in `database/extract/`.

## Workspaces & ports
| Folder | Package | Stack | Port |
|---|---|---|---|
| `client/` | `@saa/client` | React 19, Vite 8, TypeScript 7, Mantine 9, TanStack Router/Query/Table 9/Virtual, Zustand 5 | 5173 (proxies `/api` → 3000) |
| `server/` | `@saa/server` | Fastify 5, Drizzle ORM, zod 4, pg, tsx, vitest | 3000 |
| `database/` | — | docker-compose (postgres:18.6-alpine), `data/` bind mount, `extract/` (Python), `seed/`, `samples/` | 5432 |

`server/src/shared/` is pure TypeScript (no Node/DB imports) shared with the client via the `@shared/*` alias:
zod schemas, enums, normalizers, shift/date helpers, the meancheck engine.

## Commands (run from repo root)
- `npm run dev` — starts Postgres (docker), server (tsx watch) and client (vite).
- `npm run db:up` / `db:down` / `db:logs` — Postgres container. Data persists in `database/data/18/docker/`.
- `npm run db:generate` → after editing `server/src/db/schema/*` (writes `server/drizzle/*.sql`, commit them).
- `npm run db:migrate` — apply migrations. `npm run db:seed` — idempotent seed (`-- --reset`, `-- --only=endorsements`).
- `npm run db:reset` — drop data dir, recreate, migrate, seed.
- `npm run extract` — re-run the Python extraction from the source workbooks into `database/seed/`.
- `npm run check` — oxlint + typecheck + tests for all workspaces. Run before finishing any task.
- `npm run tunnel:build` — build client + server, then host the production build on a public Cloudflare quick tunnel
  (`scripts/tunnel.mjs`: db:up → db:migrate → server with `NODE_ENV=production COOKIE_SECURE=true` → prints the
  `*.trycloudflare.com` URL). `npm run tunnel` reuses the last build. `PORT=3100 npm run tunnel` if 3000 is taken.
  The URL changes every run and is public — login has no password, so only share it with testers and stop it after.

## Conventions
- Exact package versions (`.npmrc save-exact`). Before writing code against Mantine 9, TanStack Table 9, Vite 8 or TS 7,
  read the installed `node_modules/<pkg>/dist/*.d.ts` — these majors changed APIs; do not rely on memory.
- No `enum`/`namespace` (tsconfig `erasableSyntaxOnly`); use `as const` unions. `verbatimModuleSyntax` → `import type`.
- Server: one folder per module `server/src/modules/<name>/{routes,service,schemas}.ts`; zod schemas are the API contract;
  services take `db` explicitly; errors via `AppError` / `@fastify/sensible`.
- Client: `features/<module>/{api,components,hooks,store}`; server data only through TanStack Query with key factories;
  Zustand only for client-only state (session mirror, UI prefs, draft rows, upload slots). Mantine theme in `client/src/theme`
  is the only place colours are defined; bespoke visuals use CSS Modules. All dates through `lib/time.ts` — never
  `toISOString()` for calendar dates.
- Tables: every table goes through `client/src/components/table/` (`useAppTable`, `EditableDataTable`, `DataTable`,
  `ToolDateGrid`). Nothing else imports `@tanstack/react-table` directly.
- Charts: `@mantine/charts` only. No second chart/table/state library.

## Domain rules
- Tool IDs: `^SAA\d{2}H$` (normalize "SAA 54H", "SAA05", "SAA5H" → SAA05H). SAT testers `^SAT\d{2}H$`.
- Timezone Asia/Manila. DS = 06:00–17:59, NS = 18:00–05:59. A new row's default date is the shift-start date.
- Users log in with a 4-digit `id_no` only (no password). Roles: `tech`, `ee`, `admin`. Admin `1111` manages accounts.
- Endorsement: `endorse_by` 1–2 users, `endorse_to` 0–n, `progress` open | ongoing | done; NONE rows are real rows with
  `is_none = true`. Categories map to board sections s1–s6 (admin-editable `section_key`).
- Meancheck files per lot: `<LotName>-MC-DS.csv` (AfterAdjust; two header blocks; parse per-head rows by header name),
  `<Lot>.csv` (AfterManual = Re-Measure; header `DATE,TIME,SITE,TESTER,HGA,FIX,PSA,RSA,X,Y,TRAY[,TRAY_BARCODE]`),
  `<Lot>_<tool>_<seq>_<yyyymmddHHMMSS>.csv` (SAT; headerless, position col 2, PSA col 5, RSA col 6, tester col 14).
  Files are matched by the MC-DS `PenNo`, not by filename. Left = positions 1–10, 21–30; Right = 11–20, 31–40.
  24 checks: {Left, Right, Overall} × {Pitch, Roll} × {|mean(ReMeasure)−mean(SAT)| ≤ 0.05, |mean(SAT)−target| ≤ 0.05,
  sample σ(SAT) ≤ 0.08, Cpk ≥ 1.33}. Lot PASSED iff all 24 pass. Verdicts are computed **only on the server**.
- Daily grid cells: `P_AUTO | F_AUTO | P_MAN | F_MAN | IDLE | MB`; Overall is server-derived (blank → `pending`).

## Design language (from the original HTML dashboard)
Manrope font; brand gradient `#2168FD → #1E71FA → #37B1D3 → #39D6CB → #3AE4C9`; navy header gradient
`#001f4d → #003a8c → #0057c2`; day/night themes; six section colours (s1 green #2e7d32, s2 orange #e65100, s3 blue #1565c0,
s4 purple #6a1b9a, s5 red #c62828, s6 teal #00695c); DS blue / NS purple pills; remarks `-` grey, DONE green, Ongoing yellow;
NONE rows black with blue date.

## Testing
- Server: vitest — meancheck engine against `database/samples/meancheck/{passed,failed}` (expected: Passed lot 24/24;
  Failed lot fails right/pitch ×4, left/roll/sigma ≈ 0.0839, overall/pitch/sigma ≈ 0.0806), normalizers, daily Overall rule,
  and `test/routes.test.ts` integration tests via `app.inject` against the local seeded database (auto-skipped when
  PostgreSQL is down; `server/vitest.config.ts` loads the root `.env`).
- Client: vitest + jsdom + Testing Library; `src/test/setup.ts` mocks matchMedia/ResizeObserver/scrollIntoView.
  `src/lib/time.test.ts` covers the shift boundaries.

## Library gotchas verified in this repo (read before "fixing" them)
- **TanStack Table 9**: `useTable({ features, columns, data, state, on*Change })`; the `features` object from
  `tableFeatures({...})` also carries `sortFns` and the row-model factories (`sortedRowModel: createSortedRowModel()`,
  `paginatedRowModel: createPaginatedRowModel()`). Column defs use `sortFn`, not `sortingFn`. `RowSelectionState` is
  `Record<string, true>`. All of this is wrapped in `client/src/components/table/useAppTable.ts` — extend it there.
- **TanStack Router**: file routes under `client/src/routes`; `routeTree.gen.ts` is generated by the Vite plugin
  (`tanstackRouter` from `@tanstack/router-plugin/vite`) on dev/build — never hand-edit it; run `npx vite build` after
  adding a route file so the typecheck sees it. Error components receive `ErrorComponentProps` (`error: unknown`).
- **Mantine 9**: theming via `createTheme` + `cssVariablesResolver` (`client/src/theme/theme.ts`); `DatesProvider` has no
  `timezone` setting (dates are plain `YYYY-MM-DD` strings everywhere); charts take `referenceLines` from
  `GridChartBaseProps`.
- **TypeScript 7**: `erasableSyntaxOnly` forbids constructor parameter properties — declare fields explicitly.
- **zod 4**: `.partial()` KEEPS `.default()` values, so `createBody.partial()` as a PATCH schema silently resets every
  omitted field. PATCH schemas must be built from a defaults-free object (see `modules/endorsements/schemas.ts`,
  `modules/users/routes.ts`); `test/routes.test.ts` has a regression test for single-field PATCH.
- **Drizzle**: never spread one shared column-builder object into several tables (constraint names collide) — use a
  factory function (see `server/src/db/schema/minor.ts`). Query API: `db.query.<table>.findMany({ where, with })`.
- **PostgreSQL 18 image**: data lives in `/var/lib/postgresql/18/docker`; the compose bind mount targets
  `/var/lib/postgresql` (not `/var/lib/postgresql/data`).
- **Fastify**: only one `setNotFoundHandler` per instance — it lives in `server/src/app.ts` (SPA fallback + JSON 404).
  `@fastify/static` for `client/dist` must keep `wildcard: true`; with `wildcard: false` the file list is snapshotted at
  startup, so after a rebuild the new hashed `/assets/*.js` fall through to `index.html` and the app hangs on the boot
  splash (MIME error). Missing `/assets/*` return a JSON 404 on purpose.
- **Zustand 5**: a selector that builds a new array/object (`s => s.list.filter(...)`) makes `useSyncExternalStore`
  loop forever (React error #185). Wrap it: `useStore(useShallow(selector))`.

## UI building blocks (round 2)
- Every `DataTable` paginates by default (client-side 20/page with a size select, or server-side when `total` is passed);
  pass `loading={query.isFetching}`; use `paginate={false}` only for fixed report blocks. `ToolDateGrid` pages by tool
  (`GridRow.pageKey` keeps a tool's sub-rows together). Skeletons live in `components/ui/Skeletons.tsx`; the router has a
  `defaultPendingComponent` and `app/shell/RouteProgress.tsx` drives the top bar from router + query activity.
- Charts are lazy (`components/charts/lazyChart.tsx`) so recharts only downloads on chart routes; vendor chunk groups are
  in `client/vite.config.ts` (`build.rolldownOptions.output.codeSplitting.groups`).
## Phones & tablets (round 3)
- Breakpoints: `useIsMobile()` (`client/src/lib/useIsMobile.ts`) = below 768px (Mantine `sm`) → phone layout; the navbar
  becomes a burger drawer below `md` (992px, phones + tablets) and then shows the clock/shift badge at its top.
  `useHeaderActions` buttons render in the header on desktop and as a toolbar strip above the page on phones.
- `DataTable` renders **one card per row** on phones. Tune cards with `AppColumn.mobile` (`'title' | 'full' | 'hidden'`)
  and `mobileLabel`; `mobileCollapsed={(row) => …}` shows only the heading (NONE rows); `mobileLayout="scroll"` keeps
  the scrolling table (dense numeric report blocks). Inline editors get `layout="card"` there (bordered, left-aligned).
  `rowProps` `className` is merged into the card. `ToolDateGrid` stays a sticky-column scrolling grid; on touch a tap
  opens the value picker instead of cycling (`useTouchPointer()`), so there is no right-click dependency.
- `PageHeader collapsibleFilters activeFilterCount={n}` hides long filter forms behind a "Filters" toggle on phones
  (not for month/shift navigation). `KpiTile compactOnMobile` for KPI rows. Drawers are full screen on phones.
- Verify phone work with screenshots at 360×740, 390×844, 768×1024 and 1440×900 (Playwright + installed Chrome,
  `channel: 'chrome'`; the app theme lives in localStorage `saa-color-scheme`, not the OS preference). No page-level
  horizontal overflow is the bar; horizontal scroll inside a table/grid container is fine.

- Admin mutations write `audit_logs` via `server/src/lib/audit.ts` (read-before → write → diff, in one transaction);
  `GET /api/audit-logs` is keyset-paginated (no COUNT). The client drawer (`features/admin/change-logs`) is virtualised
  with `@tanstack/react-virtual` + `useInfiniteQuery`.
