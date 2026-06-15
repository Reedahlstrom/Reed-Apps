import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mountain, ArrowUpRight } from 'lucide-react'
import { Mountains } from '@/components/Mountains'
import { useActiveTrip } from '@/store/useTripStore'

export function LauncherPage() {
  const navigate = useNavigate()
  const trip = useActiveTrip()
  const tagline = trip?.onboarded
    ? `${trip.name}${trip.meta.destination ? ` · ${trip.meta.destination.split(',')[0]}` : ''}`
    : 'Set up your trip'

  return (
    <div className="alpine-backdrop grain relative min-h-dvh overflow-hidden">
      <div className="pt-safe relative px-5 pb-8">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pt-12"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full glass-soft px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-glacier-500">
              <Mountain size={13} /> supergoodtripleaders
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] tracking-tight">
              Lead the trip,
              <br />
              <span className="text-glacier-500">not the chaos.</span>
            </h1>
            <p className="mt-3 max-w-xs text-[15px] text-ice-300/70">
              Every detail of leading the trip — food, bus buddies, rooms, devotionals, health — in one place, shared live with your co-leader.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-md px-5">
        <motion.button
          onClick={() => navigate('/trip')}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="glass group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-glacier-400/12 to-glacier-600/5 p-5 text-left active:scale-[0.99]"
        >
          <div className="relative z-10">
            <p className="font-display text-xl">Open your trip</p>
            <p className="mt-0.5 text-sm text-ice-300/70">{tagline}</p>
          </div>
          <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-slate-200/70 text-ice-100 transition-transform group-active:translate-x-0.5">
            <ArrowUpRight size={20} />
          </span>
        </motion.button>
      </div>

      <Mountains className="absolute inset-x-0 bottom-0 h-48 opacity-90" />
    </div>
  )
}
