# ProVita

Career story and achievement manager — React (Vite) frontend on Workers Static Assets, Hono API Worker, Cloudflare D1.

## Stack

- **Frontend:** Vite + React (no Tailwind) — custom CSS design system
- **API:** Cloudflare Worker (`worker/index.ts`) via Hono
- **Data:** Cloudflare D1 (`provita-db`)
- **Deploy:** single Worker with SPA assets (`not_found_handling: single-page-application`)

## Design system

Monochrome grayscale UI, red accent actions, Ndot-style titles (DotGothic16 stand-in; drop real `Ndot.woff2` into `public/fonts/`), dot-matrix iconography, bubble surfaces, thin bars, sparse density.

Central components:

- `src/components/Sidebar` — collapsible / mobile overlay nav
- `src/components/TableExpandableRows` — expand, multi-sort stack, filters, pagination, density

## Develop

Local frontend only — API calls go to the **production** Worker (no local D1 / Worker runtime).

```bash
npm install
npm run dev
```

Set the production API base in `.env.development`:

```bash
VITE_API_BASE_URL=https://provita.joe-6d8.workers.dev
```

Production SPA (same Worker) uses same-origin `/api` and does not need this variable.

Production API: https://provita.joe-6d8.workers.dev

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Vite + Worker |
| `npm run build` | Typecheck + production build |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run db:migrate:remote` | Apply D1 migrations to production |
| `npm run cf-typegen` | Regenerate `Env` types from Wrangler |

## Project layout

```
src/           React app (dashboard, sidebar, table)
worker/        Hono API (D1-backed)
migrations/    D1 SQL migrations + seed data
public/fonts/  Optional real Ndot font files
```
