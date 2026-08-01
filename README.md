# ProVita

Career story and achievement manager — React (Vite) frontend on Workers Static Assets, Hono API Worker, Cloudflare D1.

## Stack

- **Frontend:** Vite + React (no Tailwind) — custom CSS design system
- **API:** Cloudflare Worker (`worker/index.ts`) via Hono
- **Auth:** [Better Auth](https://www.better-auth.com) (email/password, sessions in D1)
- **Data:** Cloudflare D1 (`provita-db`)
- **Deploy:** single Worker with SPA assets (`not_found_handling: single-page-application`)

## Design system

Monochrome grayscale UI, red accent actions, Ndot-style titles (DotGothic16 stand-in; drop real `Ndot.woff2` into `public/fonts/`), dot-matrix iconography, bubble surfaces, thin bars, sparse density.

Central components:

- `src/components/Sidebar` — collapsible / mobile overlay nav
- `src/components/TableExpandableRows` — expand, multi-sort stack, filters, pagination, density

## Setup

```bash
npm install
cp .env.example .env
```

Auth is env-only — no `account_id` in `wrangler.jsonc`. Fill in Cloudflare credentials in `.env` (see [Wrangler system environment variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)):

```bash
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

Create a token at [API Tokens](https://dash.cloudflare.com/profile/api-tokens) with the “Edit Cloudflare Workers” template (or equivalent Workers Scripts:Edit). Skip interactive `wrangler login`.

Also set Better Auth in `.env` (and `.dev.vars` for local Worker):

```bash
BETTER_AUTH_URL=https://provita.<your-subdomain>.workers.dev
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

Production secret:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

Apply the Better Auth D1 migration after pull:

```bash
npm run db:migrate:remote
```

## Develop

Local frontend only — API calls go to the **production** Worker (no local D1 / Worker runtime).

```bash
npm run dev
```

Dev server: **http://localhost:47391** (`vite preview` uses `47392`).

After deploying, set the production API base in `.env`:

```bash
VITE_API_BASE_URL=https://provita.<your-subdomain>.workers.dev
```

Production SPA (same Worker) uses same-origin `/api` and does not need this variable.

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Vite frontend (hits `VITE_API_BASE_URL`) |
| `npm run build` | Typecheck + production build |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run db:migrate:remote` | Apply D1 migrations to production |
| `npm run cf-typegen` | Regenerate `Env` types from Wrangler |

## Project layout

```
src/           React app (dashboard, sidebar, table, /login)
worker/        Hono API + Better Auth (D1-backed)
migrations/    D1 SQL migrations + seed data
public/fonts/  Optional real Ndot font files
```

Sign up at `/login`. New users get a `profiles` row keyed to their Better Auth `user.id`. API routes require a session cookie.
