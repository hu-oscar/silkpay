# Deploying Silkpay to Vercel

The repo is a `pnpm` monorepo with Next.js in `apps/web`. Vercel needs two
things : (1) the Next.js app's directory, and (2) an install command that
walks up to the monorepo root so workspace dependencies resolve.

Both are configured in [`apps/web/vercel.json`](apps/web/vercel.json) — you
just need to set the **Root Directory** in the Vercel project settings.

## First deploy (one-time, web UI, ~3 min)

1. Go to <https://vercel.com/new> and import the GitHub repo
   `hu-oscar/silkpay`.
2. **Root Directory** : click "Edit" and set to `apps/web`.
3. **Framework preset** : Next.js (auto-detected — leave it).
4. **Build & Output Settings** : leave defaults; `vercel.json` overrides
   the install command for you.
5. **Environment Variables** : copy the 3 Supabase keys from your
   `apps/web/.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as **Secret**)
   - Apply to **Production, Preview, and Development** scopes.
6. Click **Deploy**.

## After first deploy

- Each push to the `oscar` branch automatically triggers a new
  preview deploy → URL like
  `https://<project>-git-oscar-<team>.vercel.app`.
- To promote `oscar` to production, either change the Production Branch in
  Vercel settings, or run `vercel promote` from the CLI.

## Caveat — serverless mutations

Each Vercel function instance has its own memory. The DB lives in Supabase,
so reads and writes are persisted. The fake-user cookie also survives since
it's stored client-side. ✅ No issue.

## Local preview

```bash
pnpm --filter @silkpay/web build
pnpm --filter @silkpay/web start
```
