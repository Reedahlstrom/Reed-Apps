# Reed Apps

A personal toolkit — a small, beautiful bin for the apps I build for my own life.

**First app: Trip Leader** — a command center for leading a humanitarian youth trip
(Patagonia → Concepción, Chile). Food orders, bus-buddy pairing, 2-on-1 meetings,
room/group assignments, notes, and a daily health check — all on the phone, all
synced between the two trip leaders.

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** — alpine / Patagonia design system (`src/index.css`)
- **Zustand** — single source of truth, persisted to `localStorage`, offline-first
- **Supabase (Postgres)** — email+password auth + invite-based trip sharing + realtime sync
- **Hosting:** Cloudflare Pages (`BrowserRouter`, root base, `_redirects` SPA fallback). Live: https://reed-apps.pages.dev → supergoodtripleaders.us
- Icons: `lucide-react` (no emojis). Motion: `framer-motion`.

## Develop

```bash
npm install
npm run dev            # http://localhost:5173/Reed-Apps/
npm run dev -- --host  # test on your phone over the same wifi
npm run build          # typecheck + production build
node scripts/shot.mjs "/#/trip" dash   # mobile screenshot via local Chrome
```

## Supabase

1. SQL Editor → run `supabase/migrations/0001_init.sql` (trips + membership + invites + realtime).
2. Authentication → Providers → Email → turn **OFF "Confirm email"** (so signup logs straight in).
3. Project URL + **publishable** (anon) key go in `.env.local` (see `.env.example`) for local builds.

Sharing model: a leader creates a trip → **Settings → Create invite link** → sends it to a
co-leader, who signs in and joins the same trip (membership enforced by RLS). The app runs
fully offline until Supabase is set up; once present it syncs live across devices.

The whole data model and feature map lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Deploy (Cloudflare Pages)

The Pages project is Git-connected with **no build command**, so the built `dist/` is
committed and served directly. To ship a change:

```bash
npm run build      # rebuild dist/
git add -A && git commit -m "..."   # include dist/
git push           # Cloudflare auto-deploys
```

(If you later set the Pages build command to `npm run build` + output `dist`, you can
stop committing `dist/` and add `VITE_SUPABASE_*` as project env vars instead.)
