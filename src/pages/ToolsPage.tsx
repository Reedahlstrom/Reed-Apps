import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed,
  Users,
  MessagesSquare,
  NotebookPen,
  BedDouble,
  Boxes,
  Activity,
  Users2,
  Settings,
  ChevronRight,
  Shield,
  BookOpen,
  Plane,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { useActiveTrip } from '@/store/useTripStore'

interface Tool {
  to: string
  label: string
  desc: string
  icon: LucideIcon
  count?: (t: ReturnType<typeof useActiveTrip>) => string | undefined
}

const TOOLS: Tool[] = [
  { to: '/trip/food', label: 'Food Orders', desc: 'Menus, pass-the-phone ordering, vendor tally', icon: UtensilsCrossed, count: (t) => (t?.foodDays.length ? `${t.foodDays.length} days` : undefined) },
  { to: '/trip/bus', label: 'Bus Buddies', desc: 'Daily seat pairings, no repeats', icon: Users, count: (t) => (t?.busDays.length ? `${t.busDays.length} days` : undefined) },
  { to: '/trip/meetings', label: '2-on-1 Meetings', desc: 'Who still needs theirs, notes & follow-ups', icon: MessagesSquare, count: (t) => { const p = t?.meetings.filter((m) => m.status !== 'done').length; return p ? `${p} to go` : undefined } },
  { to: '/trip/rooms', label: 'Room Assignments', desc: 'Beds, occupants, mid-trip switch', icon: BedDouble },
  { to: '/trip/groups', label: 'Groups', desc: 'Auto-balanced random groups', icon: Boxes, count: (t) => (t?.groupSets.length ? `${t.groupSets.length} sets` : undefined) },
  { to: '/trip/committees', label: 'Committees', desc: 'Crews, responsibilities & notes', icon: Shield, count: (t) => (t?.committees.length ? `${t.committees.length}` : undefined) },
  { to: '/trip/devotionals', label: 'Devotionals', desc: 'Briefing, morning & night devos', icon: BookOpen, count: (t) => (t?.devotionals.length ? `${t.devotionals.length}` : undefined) },
  { to: '/trip/flights', label: 'Flights', desc: 'Everyone’s flight numbers, live status', icon: Plane, count: (t) => (t?.flights.length ? `${t.flights.length}` : undefined) },
  { to: '/trip/poop', label: 'Health Tracker', desc: 'Daily bowel-movement check', icon: Activity },
  { to: '/trip/notes', label: 'Notes', desc: 'Reminders, contacts, important info', icon: NotebookPen, count: (t) => (t?.notes.length ? `${t.notes.length}` : undefined) },
  { to: '/trip/people', label: 'Roster', desc: 'Everyone on the trip', icon: Users2, count: (t) => (t?.people.length ? `${t.people.length}` : undefined) },
  { to: '/trip/settings', label: 'Trip Settings', desc: 'Dates, switch trips, start fresh', icon: Settings },
]

export function ToolsPage() {
  const trip = useActiveTrip()
  const navigate = useNavigate()
  return (
    <div className="space-y-4 pt-2">
      <PageHeader title="All Tools" subtitle="Everything for the trip" icon={Boxes} />
      <div className="space-y-2.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const badge = tool.count?.(trip)
          return (
            <button
              key={tool.to}
              onClick={() => navigate(tool.to)}
              className="glass flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-transform active:scale-[0.99]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl glass-soft text-glacier-400">
                <Icon size={21} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] leading-tight">{tool.label}</p>
                <p className="truncate text-xs text-ice-300/55">{tool.desc}</p>
              </div>
              {badge && <span className="num-chip rounded-full bg-slate-100 px-2.5 py-1 text-xs text-ice-200">{badge}</span>}
              <ChevronRight size={18} className="shrink-0 text-ice-300/40" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
