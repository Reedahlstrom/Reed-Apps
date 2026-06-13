# Architecture — Reed Apps / Trip Leader

## Shape

Reed Apps is a launcher (`/`) over individual apps. The first app, **Trip Leader**,
lives under `/trip/*`. Everything is a mobile-first SPA.

```
src/
  main.tsx              entry — HashRouter, seeds a default trip
  App.tsx               routes (AuthGate → RequireOnboarded → AppShell)
  index.css             alpine design system (Tailwind v4 @theme tokens)
  types/domain.ts       the entire data model
  store/useTripStore.ts Zustand store (localStorage-persisted) + all mutations
  lib/
    algorithms.ts       bus-buddy + group assignment (deterministic, no repeats)
    health.ts           poop-streak status logic
    dates.ts            trip-day math
    supabase.ts         client (null until configured)
    sync.ts             cross-device sync bridge
  components/           shell, sheet, ui primitives, avatar, mountains
  pages/                one page per feature
supabase/migrations/    Postgres schema
scripts/shot.mjs        mobile screenshot helper
```

## Data model — one Trip is one document

A `Trip` (see `types/domain.ts`) holds the roster plus every feature's data
(`foodDays`, `busDays`, `meetings`, `notes`, `roomPlans`, `groupSets`,
`poopNights`). Switching to a new group is just selecting a different `Trip` —
**nothing is destroyed**, so "Trip 1" and "Trip 2" coexist.

`AppData = { trips, activeTripId, rev }` is the persisted root.

### Why a JSONB document, not normalized tables

Two leaders, small data, must never lose anything and must sync live. One row per
trip (`public.trips.data` = JSONB) makes sync a single upsert + one realtime
subscription, and keeps the offline model and the database identical. Conflict
strategy is last-write-wins by `updatedAt` (fine for two people who rarely edit
the same field in the same second).

## Mutations

Every write goes through `mutateActive(state, draft => …)` in the store, which
deep-clones the active trip, applies the change, stamps `updatedAt`, and bumps
`rev`. This guarantees immutable updates and one consistent place where every
change is recorded — which is also the sync trigger.

Full CRUD is exposed for every entity: people, food days/menu/orders, bus days,
meetings + follow-ups, notes, rooms + occupants, group sets, and poop nights.

## Assignment algorithms (`lib/algorithms.ts`)

Bus buddies and random groups are **pure combinatorics**, not an LLM — so they
cannot forget a name or duplicate a person, and they provably minimize repeats by
running many randomized restarts and keeping the lowest-repeat result (stopping
at zero). `coOccurrence()` tallies who has been together; `generateBusPods()` and
`generateGroups()` consume only *locked* prior days as history.

## Auth & sync (`lib/supabase.ts`, `lib/sync.ts`)

- Magic-link auth; access gated by an **email allowlist** in Postgres (RLS).
  Both leaders are on the list and share all trips.
- `pullTrips` / `pushTrip` / `subscribeTrips` are no-ops until env vars exist, so
  the rest of the app never branches on connectivity.
```
