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
- **Supabase (Postgres)** — magic-link auth + realtime cross-device sync
- **Hosting:** GitHub Pages (`HashRouter`, base `/Reed-Apps/`)
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

1. Create the schema: open Supabase → SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
2. Add both leaders' emails to the `allowed_emails` table (the SQL seeds Reed's).
3. Put the project URL + **publishable** (anon) key in `.env.local` (see `.env.example`).
4. The app runs fully offline until those are set; once present it syncs live.

The whole data model and feature map lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Deploy

```bash
npm run deploy   # builds and publishes dist/ to the gh-pages branch
```
