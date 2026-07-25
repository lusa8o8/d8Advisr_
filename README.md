# D8Advisr

D8Advisr is a pnpm monorepo containing separate Vite/React clients backed by
one Supabase project.

## Client architecture

| Package | Purpose | Suggested production origin |
| --- | --- | --- |
| `artifacts/d8advisr` | Consumer experience and the seeded-admin console | `https://d8advisr.com` |
| `artifacts/d8advisr-partner` | Partner application, venue, and event tools | `https://partner.d8advisr.com` |
| `lib/d8-core` | Shared Supabase client, auth state, account context, and domain types | Not deployed |

Admin remains in the consumer client. Access is decided by the server-backed
`profiles.is_admin` flag; there is no UI flow that can create or promote an
admin. Partner capability checks remain enforced by PostgreSQL/RLS as well as
the partner client.

The database returns account identity through
`get_current_account_context()`. Each client owns its own URL decisions, so the
database no longer routes users to consumer or partner paths.

## Local development

Install dependencies and copy the environment examples:

```bash
pnpm install
copy .env.example .env
copy artifacts\d8advisr-partner\.env.example artifacts\d8advisr-partner\.env
```

Use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in both env
files, then run the clients in separate terminals:

```bash
pnpm dev:consumer
pnpm dev:partner
```

The defaults are consumer on `http://localhost:3000` and partner on
`http://localhost:3001`.

Important client variables:

- Consumer: `VITE_PARTNER_ORIGIN` and, for OAuth, `VITE_AUTH_REDIRECT_ORIGIN`.
- Partner: `VITE_CONSUMER_ORIGIN` and `VITE_AUTH_REDIRECT_ORIGIN`.
- Both: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally
  `DEV_ALLOWED_HOSTS`.

Do not commit real `.env` files.

## Deployment

Create two Vercel projects from this repository:

1. Consumer: repository root `.` using the root `vercel.json`.
2. Partner: root directory `artifacts/d8advisr-partner` using that package's
   `vercel.json`. Enable Vercel's option to include source files outside the
   root directory because the app imports `lib/d8-core` and uses the workspace
   lockfile.

Set the same Supabase public variables in both projects. Set the consumer
project's `VITE_PARTNER_ORIGIN` to the partner domain, and set the partner
project's `VITE_CONSUMER_ORIGIN` to the consumer domain. Each project's
`VITE_AUTH_REDIRECT_ORIGIN` must be its own public origin.

Add both origins to Supabase Auth URL configuration:

- `https://d8advisr.com/auth/callback`
- `https://d8advisr.com/password/update`
- `https://partner.d8advisr.com/auth/callback`
- `https://partner.d8advisr.com/password/update`

Supabase browser sessions use origin-scoped storage, so signing into one
subdomain does not automatically sign the browser into the other. Account
classification still prevents a signed-in consumer, partner, or admin from
using the wrong client.

The checked-in `vercel-partner.json` is available for CLI deployments initiated
from the repository root; dashboard deployments should use the partner package
as their root.

## Supabase

The CLI configuration and migrations live in `supabase/`. Local services
require Docker:

```bash
supabase start
supabase db reset
```

Linking or pushing to the hosted project is a separate production action:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The route-neutral account-context migration must be applied before the split
clients are released. The shared client temporarily falls back to the legacy
RPC so deployment can be staged safely.

To replace the Supabase project URL shown during Google OAuth, configure a
Supabase custom domain (for example `auth.d8advisr.com`), add its callback URL
to the Google OAuth application, and use that custom URL as
`VITE_SUPABASE_URL`. This is an infrastructure setting, not a client-side
branding change.

## Verification

```bash
pnpm run typecheck
pnpm --filter @workspace/d8advisr run build
pnpm --filter @workspace/d8advisr-partner run build
```
