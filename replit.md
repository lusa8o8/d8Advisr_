# D8Advisr Workspace

## Overview

pnpm workspace monorepo. Main artifact is D8Advisr — a mobile-first date & group planning app for Lagos (Nigeria) and Lusaka (Zambia). Philosophy: "boring but useful."

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (api-server artifact)
- **Database**: Supabase (PostgreSQL + RLS + Auth)
- **Client DB**: @supabase/supabase-js with full TypeScript types
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Wouter routing
- **Auth**: Supabase Auth (email/password + Google OAuth) via AuthContext

## D8Advisr App (`artifacts/d8advisr`)

### Brand
- Primary: #FF5A5F | Success: #00C851 | Warning: #FF9500 | BG: #F7F7F7
- Font: Poppins | Dark mode supported via CSS variables + `.dark` class on `document.documentElement`
- Theme stored in localStorage as `d8advisr_theme`

### Architecture
- `src/context/AuthContext.tsx` — AuthProvider + useAuth hook (session, signUp, signIn, signInWithGoogle, signOut)
- `src/lib/supabase.ts` — Supabase client + full TypeScript types for all tables
- `src/hooks/useVenues.ts` — useVenues(city?) and useEvents(city?, limit) hooks for live DB queries
- `src/App.tsx` — Router with AuthProvider wrap, AuthGuard for protected routes

### Auth Flow
- Welcome → `/signup` (Get Started) or `/signin` (Sign In)
- SignUp: email/password via Supabase, shows email confirmation screen after
- SignIn: email/password + Google OAuth (needs redirect URL configured in Supabase dashboard)
- After auth → `/home`; Google OAuth uses `redirectTo` with BASE_URL + `/auth/callback`
- AuthGuard redirects unauthenticated users to `/`

### Supabase Project
- Project ref: `evfftzhrucwwfnertiup`
- Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`
- Schema migration: `supabase/migrations/20260428100000_d8advisr_schema.sql`
- Tables: profiles, venues, events, plans, plan_stops, stash_funds, stash_members, stash_transactions, saved_venues
- All tables have RLS; venues + events publicly readable; profiles need auth

### Data
- **Lusaka seed**: `supabase/seed_lusaka.sql` — 15 venues (Verified / D8 Approved / Hidden Gem tiers) + 5 events
- Hidden Gem venues lock behind "Link Stash" paywall (checked via `d8advisr_payment_linked` in localStorage)
- HomeDiscovery fetches live from Supabase via `useVenues('Lusaka')` and `useEvents('Lusaka')`

### CRITICAL React rules
- No `import React from 'react'` — named imports only
- No `import React` at all; use `{ useState, useEffect }` etc.

### Revenue model
- Curation packages, sinking fund (bank partnerships), paid promo events
- D8 Partner Portal (B2B layer) — `is_partner` flag on profiles

## Executing SQL against Supabase
Direct psql is blocked (IPv6). Use the management API via Node.js:
```js
const body = JSON.stringify({ query: sqlString });
// POST https://api.supabase.com/v1/projects/evfftzhrucwwfnertiup/database/query
// Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}
```

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## D8Advisr Mockup

Full high-fidelity mobile app mockup for D8Advisr (date and group planning app) built in the mockup sandbox.

**Location:** `artifacts/mockup-sandbox/src/components/mockups/d8advisr/`

**18 screens:**
1. Welcome / Value Prop
2. Sign-Up / Auth
3. Initial Preferences
4. Home / Discovery Feed
5. Map View
6. Filter Modal
7. Venue Details
8. Plan Generator / Surprise Me
9. Generated Plan Overview
10. Plan Detail / Cost Review
11. Plan Edit / Adjustment
12. Execution Tracker
13. Feedback / Completion Log
14. Profile Overview
15. Preference Edit
16. Budget Dashboard / Sinking Fund
17. Create Group Plan
18. Notifications Center

**Brand:** #FF5A5F (primary), #00C851 (success), #FF9500 (warning), #F7F7F7 (bg), Poppins font

### `artifacts/d8advisr/src/lib/` — Shared constants layer

All cross-page shared data lives here. Import from these files instead of defining locally in pages.

| File | Contents |
|---|---|
| `lib/types.ts` | TypeScript interfaces: `PartnerEvent`, `Platform`, `PostType`, `City`, `D8Message`, etc. |
| `lib/constants.ts` | `CITIES`, `PLATFORMS`, `POST_TYPES`, `LS_KEYS`, status pill maps, frequency labels |
| `lib/demo.ts` | Demo seed data: `DEMO_PARTNER`, `DEMO_EVENTS`, `DEMO_EVENT_MAP`, `DEMO_DEMAND`, `DEMO_MESSAGES` |

**Rule:** When a value (city list, platform list, localStorage key) is used in more than one page, it lives in `lib/`. Pages import, never redefine.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
