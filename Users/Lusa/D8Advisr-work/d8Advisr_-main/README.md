# D8Advisr

D8Advisr is a Vite/React app backed by Supabase and deployed to Vercel.

## Local Development

```bash
pnpm install
pnpm --filter @workspace/d8advisr run dev
```

Copy `.env.example` to a local `.env` file or configure the same variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS` as a comma-separated list for `/admin` access
- `DEV_ALLOWED_HOSTS` if you need Vite dev/preview access from a LAN hostname

Do not commit real `.env` files. Supabase anon keys are public runtime keys, but keeping environment-specific values out of source avoids accidental project coupling and rotation mistakes.

## Deployment

The root `vercel.json` builds the frontend from `artifacts/d8advisr` and serves `artifacts/d8advisr/dist/public`.

If the Express API artifact is deployed separately, set `ALLOWED_ORIGINS` to the exact production frontend origins. Without that variable, CORS only allows local development origins.

## Supabase

Schema migrations live in `supabase/migrations`.

Apply migrations with the Supabase CLI after logging in and linking the project:

```bash
supabase db push
```

Partner venue/event writes require a `partner_applications.status` of `live`. Users can create and update their own application details, but cannot self-approve through the public client.
