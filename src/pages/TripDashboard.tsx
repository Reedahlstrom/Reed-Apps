import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UtensilsCrossed,
  Users,
  Activity,
  MessagesSquare,
  AlertTriangle,
  Check,
  MapPin,
  Pin,
  StickyNote,
  NotebookPen,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
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
  const toggleFollowUp = useTripStore((s) => s.toggleFollowUp)
  if (!trip) return null

  const today = todayISO()
  const dayNo = tripDayNumber(today, trip.meta.startDate, trip.meta.endDate)
  const totalDays = tripDays(trip.meta.startDate, trip.meta.endDate).length

  // attention items
  const pendingMeetings = trip.meetings.filter((m) => m.status !== 'done').length
  const followUpItems = trip.meetings.flatMap((m) => m.followUps.filter((f) => !f.done).map((f) => ({ f, personId: m.personId })))
  const concern = trip.people
    .map((p) => ({ p, s: poopStatusFor(p.id, trip.poopNights, today) }))
    .filter((x) => x.s.level === 'bad')

  const firstName = trip.people.find((p) => p.role === 'leader')?.name.split(' ')[0]

  // notes for the dashboard: pinned first, then most recent
  const dashNotes = [...trip.notes]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 4)

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
      {(concern.length > 0 || pendingMeetings > 0 || followUpItems.length > 0) && (
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
          {followUpItems.length > 0 && (
            <div className="space-y-0.5 rounded-2xl glass p-2">
              <p className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-ice-300/55">Follow-ups</p>
              {followUpItems.slice(0, 6).map(({ f, personId }) => {
                const name = trip.people.find((p) => p.id === personId)?.name.split(' ')[0]
                return (
                  <div key={f.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                    <button
                      onClick={() => toggleFollowUp(personId, f.id)}
                      aria-label="Mark done"
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ice-300/35 text-transparent transition-colors hover:border-status-good hover:text-status-good active:scale-90"
                    >
                      <Check size={14} />
                    </button>
                    <p className="flex-1 text-sm leading-snug text-ice-100">
                      {f.text} <span className="text-ice-300/50">· {name}</span>
                    </p>
                  </div>
                )
              })}
              {followUpItems.length > 6 && (
                <button onClick={() => navigate('/trip/meetings')} className="px-2 pb-1 pt-0.5 text-xs text-glacier-500">+{followUpItems.length - 6} more in 2-on-1s</button>
              )}
            </div>
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

      {/* notes — always visible; pinned first so you see them on open */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium uppercase tracking-wider text-ice-300/60">Notes</p>
          <button onClick={() => navigate('/trip/notes')} className="text-xs text-glacier-500">All</button>
        </div>
        {dashNotes.length > 0 ? (
          dashNotes.map((n) => (
            <button key={n.id} onClick={() => navigate('/trip/notes')} className="glass flex w-full items-start gap-3 rounded-2xl p-3.5 text-left active:scale-[0.99]">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg glass-soft text-glacier-500">
                {n.pinned ? <Pin size={15} /> : <StickyNote size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-ice-300/70">{n.body}</p>}
                {n.category === 'contact' && n.phone && <p className="mt-1 text-sm text-status-good">{n.phone}</p>}
              </div>
            </button>
          ))
        ) : (
          <button onClick={() => navigate('/trip/notes')} className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.99]">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg glass-soft text-glacier-500"><NotebookPen size={17} /></span>
            <div className="flex-1">
              <p className="font-medium leading-tight">Notes &amp; reminders</p>
              <p className="text-xs text-ice-300/55">Jot contacts, reminders, important info</p>
            </div>
            <Plus size={18} className="text-ice-300/40" />
          </button>
        )}
      </div>
    </div>
  )
}
