# SAA Process Endorsement & Meancheck

Web app for the SAA (HGA static-attitude-adjust) process team. It replaces the Excel endorsement log, the meancheck `.xls`
template and the "1st Meancheck Monitoring" workbook with one multi-user application backed by PostgreSQL.

| Part | Stack | URL (dev) |
|---|---|---|
| `client/` | React 19 · Vite 8 · TypeScript 7 · Mantine 9 · TanStack Router / Query / Table 9 · Zustand 5 | http://localhost:5173 |
| `server/` | Fastify 5 · Drizzle ORM · zod 4 · PostgreSQL 18 | http://localhost:3000/api |
| `database/` | docker-compose (`postgres:18.6-alpine`), persistent data in `database/data/`, Python extractors, seed files | localhost:5432 |

## First run
```bash
cp .env.example .env          # defaults work for local development
npm install
npm run db:up                 # starts PostgreSQL 18 in Docker (data persists in database/data/18/docker)
npm run db:migrate            # applies server/drizzle/*.sql
npm run db:seed               # loads database/seed/* (Excel data) + the two sample meancheck lots
npm run dev                   # server (tsx watch) + client (vite)
```
Sign in with ID **1111** (admin) or any seeded user (9000 Evalice Villacampa, 9002 Eva, 9003 Dea, …). Users are managed under
Admin › Users.

## Everyday commands
| Command | What it does |
|---|---|
| `npm run dev` | start db + server + client |
| `npm run check` | oxlint + typecheck + tests (client and server) |
| `npm run db:generate` | create a migration after editing `server/src/db/schema/*` |
| `npm run db:seed -- --reset` | wipe the seeded tables and reload |
| `npm run db:seed -- --only=endorsements,daily` | reload selected data sets |
| `npm run extract` | re-extract the seed CSV/JSON from the source workbooks (Python 3 + openpyxl) |
| `npm run db:reset` | drop the data directory and rebuild everything |
| `npm run build` | production build (`client/dist` is served by the server at `/`) |
| `npm run tunnel:build` | build, then share the app on a public HTTPS link (see below) |
| `npm run tunnel` | share the last build again without rebuilding |

## Sharing a test build (Cloudflare Tunnel)
Lets testers open the app from their own phone or PC, including outside the office network. No Cloudflare account is
needed, and nothing is installed on Windows: the `cloudflared` program comes with `npm install`.

```bash
npm run tunnel:build          # first time, or after code changes: build client + server, then host
npm run tunnel                # host the last build again (faster, no rebuild)
```

The script:
1. starts PostgreSQL (Docker Desktop must be running);
2. applies migrations;
3. starts the production server on port 3000;
4. prints the link in a box:

```
  ┌──────────────────────────────────────────────────────┐
  │  https://some-random-words.trycloudflare.com         │
  └──────────────────────────────────────────────────────┘
```

Send that link to your testers. Press **Ctrl+C** to stop the server and the tunnel; PostgreSQL keeps running
(`npm run db:down` stops it).

- **Port 3000 busy?** Your `npm run dev` server is probably using it. Stop it first, or use another port:
  `PORT=3100 npm run tunnel` (Git Bash) or `$env:PORT=3100; npm run tunnel` (PowerShell).
- **The link changes every run.** Send testers the new one each time.
- **Keep your PC on and awake** while people are testing.
- **The link is public, and login is only a 4-digit ID with no password.** Share it only with testers, and stop the
  tunnel when testing is done.

## Modules
- **Endorsement** — shift board (date + DS/NS) with the six sections, KPI tiles, inline editing, NONE rows, image attachments,
  CSV/XLSX export; history with filters; per-tool drilldown.
- **Meancheck** — upload the 3 CSVs of a lot (AfterAdjust `*-MC-DS.csv`, AfterManual `<lot>.csv`, SAT
  `<lot>_<tool>_<seq>_<ts>.csv`) → the server computes the 24 checks (verified against the Excel template) → result card,
  lot list, per-tool status board.
- **1st Meancheck daily** — tools × days grid (P/F Auto/Man, IDLE, MB) with a server-derived Overall and pass-rate chart.
- **PM Status** — monthly PM checklist per tool with derived vacuum averages/deltas.
- **Contact Chip** — monthly per-tool contact chip grid (under Maintenance, next to PM Status).
- **Admin** — users (4-digit ID login), tools, regions, model specs, categories.

## Meancheck rule (as implemented in `server/src/shared/meancheck/engine.ts`)
Left fixture = tray positions 1–10 & 21–30, Right = 11–20 & 31–40. For each of Left / Right / Overall × Pitch (PSA) / Roll (RSA):
`|mean(ReMeasure) − mean(SAT)| ≤ 0.05`, `|mean(SAT) − target| ≤ 0.05`, `σ(SAT) ≤ 0.08` (sample σ), `Cpk ≥ 1.33` with
`Cpk = min((T+tol−m)/(3σ), (m−(T−tol))/(3σ))`. The lot is PASSED only when all 24 checks pass. Targets/tolerances per model are
editable under Admin › Model Specs.

## Source data
The original workbooks live in `D:\Workstation\evalice\docs` (read-only). `database/extract/run_all.py` converts them to the
files in `database/seed/`; `database/seed/README.md` lists row counts and the normalisation decisions.
