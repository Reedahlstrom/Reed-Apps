import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UtensilsCrossed,
  Users,
  Activity,
  MessagesSquare,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  type LucideIcon,
} from 'lucide-react'
import { useActiveTrip } from '@/store/useTripStore'
import { prettyDay, todayISO, tripDayNumber, tripDays } from '@/lib/dates'
import { poopStatusFor } from '@/lib/health'
import { SunsetHero } from '@/components/Mountains'

function QuickTile({ icon: Icon, label, hint, to }: { icon: LucideIcon; label: string; hint: string; to: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="glass flex flex-col gap-2 rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl glass-soft text-glacier-400">
        <Icon size={20} strokeWidth={2} />
      </span>
      <div>
        <p className="font-display text-[15px] leading-tight">{label}</p>
        <p className="text-xs text-ice-300/55">{hint}</p>
      </div>
    </button>
  )
}

export function TripDashboard() {
  const trip = useActiveTrip()
  const navigate = useNavigate()
  if (!trip) return null

  const today = todayISO()
  const dayNo = tripDayNumber(today, trip.meta.startDate, trip.meta.endDate)
  const totalDays = tripDays(trip.meta.startDate, trip.meta.endDate).length

  // attention items
  const pendingMeetings = trip.meetings.filter((m) => m.status !== 'done').length
  const openFollowUps = trip.meetings.reduce((n, m) => n + m.followUps.filter((f) => !f.done).length, 0)
  const concern = trip.people
    .map((p) => ({ p, s: poopStatusFor(p.id, trip.poopNights, today) }))
    .filter((x) => x.s.level === 'bad')

  const firstName = trip.people.find((p) => p.role === 'leader')?.name.split(' ')[0]

  return (
    <div className="space-y-5 pt-2">
      {/* hero — sunset band with Fitz Roy peaks */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SunsetHero className="rounded-2xl shadow-[var(--shadow-lift)]">
          <div className="relative z-10 px-5 pb-28 pt-5">
            <p className="text-sm text-white/70">{firstName ? `Hi ${firstName} —` : 'Welcome —'}</p>
            <h1 className="mt-0.5 font-display text-4xl leading-tight text-white">
              {dayNo ? `Day ${dayNo}` : prettyDay(today)}
              {dayNo && <span className="text-white/45"> / {totalDays}</span>}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin size={14} className="text-white/80" /> {trip.meta.destination}
            </p>
          </div>
        </SunsetHero>
      </motion.div>

      {/* needs attention */}
      {(concern.length > 0 || pendingMeetings > 0 || openFollowUps > 0) && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">Needs attention</p>
          {concern.length > 0 && (
            <button
              onClick={() => navigate('/trip/poop')}
              className="flex w-full items-center gap-3 rounded-2xl border border-status-bad/30 bg-status-bad/12 p-3.5 text-left active:scale-[0.99]"
            >
              <AlertTriangle size={20} className="shrink-0 text-status-bad" />
              <p className="flex-1 text-sm text-ice-100">
                {concern.length === 1
                  ? `${trip.people.find((p) => p.id === concern[0].p.id)?.name} hasn't gone in ${concern[0].s.days} days`
                  : `${concern.length} people haven't gone in 3+ days`}
              </p>
            </button>
          )}
          {pendingMeetings > 0 && (
            <button
              onClick={() => navigate('/trip/meetings')}
              className="flex w-full items-center gap-3 rounded-2xl glass p-3.5 text-left active:scale-[0.99]"
            >
              <MessagesSquare size={20} className="shrink-0 text-glacier-400" />
              <p className="flex-1 text-sm text-ice-100">{pendingMeetings} two-on-ones still to do</p>
            </button>
          )}
          {openFollowUps > 0 && (
            <button
              onClick={() => navigate('/trip/meetings')}
              className="flex w-full items-center gap-3 rounded-2xl glass p-3.5 text-left active:scale-[0.99]"
            >
              <CheckCircle2 size={20} className="shrink-0 text-glacier-400" />
              <p className="flex-1 text-sm text-ice-100">{openFollowUps} open follow-ups</p>
            </button>
          )}
        </div>
      )}

      {/* daily tools */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">Daily</p>
        <div className="grid grid-cols-2 gap-3">
          <QuickTile icon={UtensilsCrossed} label="Food" hint="Take orders" to="/trip/food" />
          <QuickTile icon={Users} label="Bus Buddies" hint="Pair up" to="/trip/bus" />
          <QuickTile icon={Activity} label="Health" hint="Nightly check" to="/trip/poop" />
          <QuickTile icon={MessagesSquare} label="2-on-1s" hint="Meet kids" to="/trip/meetings" />
        </div>
      </div>
    </div>
  )
}
