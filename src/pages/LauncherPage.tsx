import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mountain, ArrowUpRight, Plus } from 'lucide-react'
import { Mountains } from '@/components/Mountains'
import { useTripStore } from '@/store/useTripStore'

interface AppTile {
  id: string
  name: string
  tagline: string
  to?: string
  accent: string
}

export function LauncherPage() {
  const navigate = useNavigate()
  const trips = useTripStore((s) => s.trips)
  const activeName = trips.find((t) => t.id === useTripStore.getState().activeTripId)?.name

  const apps: AppTile[] = [
    {
      id: 'trip',
      name: 'Trip Leader',
      tagline: activeName ? `${activeName} · Patagonia` : 'Humanitarian trip command center',
      to: '/trip',
      accent: 'from-glacier-400/30 to-deep-800/40',
    },
  ]

  return (
    <div className="alpine-backdrop grain relative min-h-dvh overflow-hidden">
      {/* hero */}
      <div className="pt-safe relative px-5 pb-8">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-10"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full glass-soft px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-glacier-400">
              <Mountain size={13} /> Reed Apps
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-tight">
              A quiet toolkit
              <br />
              <span className="text-glacier-400">for real life.</span>
            </h1>
            <p className="mt-3 max-w-xs text-[15px] text-ice-300/70">
              Personal apps, built to be simple and beautiful. Pick one to begin.
            </p>
          </motion.div>
        </div>
      </div>

      {/* app grid */}
      <div className="relative z-10 mx-auto max-w-md px-5">
        <div className="space-y-3">
          {apps.map((app, i) => (
            <motion.button
              key={app.id}
              onClick={() => app.to && navigate(app.to)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`glass group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${app.accent} p-5 text-left active:scale-[0.99]`}
            >
              <div className="relative z-10">
                <p className="font-display text-xl">{app.name}</p>
                <p className="mt-0.5 text-sm text-ice-300/70">{app.tagline}</p>
              </div>
              <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-ice-100 transition-transform group-active:translate-x-0.5">
                <ArrowUpRight size={20} />
              </span>
            </motion.button>
          ))}

          {/* future slot */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-ice-300/15 p-5 text-ice-300/45"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-ice-300/15">
              <Plus size={18} />
            </span>
            <p className="text-sm">More apps land here as you build them.</p>
          </motion.div>
        </div>
      </div>

      <Mountains className="absolute inset-x-0 bottom-0 h-48 opacity-90" />
    </div>
  )
}
