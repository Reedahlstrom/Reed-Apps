import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarDays, CloudOff, Cloud, LayoutGrid, UtensilsCrossed, Users, Activity, Boxes } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useActiveTrip } from '@/store/useTripStore'
import { isSupabaseConfigured } from '@/lib/supabase'
import { prettyShort, todayISO, tripDayNumber } from '@/lib/dates'

const NAV = [
  { to: '/trip', label: 'Today', icon: LayoutGrid, end: true },
  { to: '/trip/food', label: 'Food', icon: UtensilsCrossed, end: false },
  { to: '/trip/bus', label: 'Bus', icon: Users, end: false },
  { to: '/trip/poop', label: 'Health', icon: Activity, end: false },
  { to: '/trip/tools', label: 'Tools', icon: Boxes, end: false },
]

export function AppShell() {
  const trip = useActiveTrip()
  const navigate = useNavigate()
  const today = todayISO()
  const dayNo = trip ? tripDayNumber(today, trip.meta.startDate, trip.meta.endDate) : null

  return (
    <div className="alpine-backdrop grain relative min-h-dvh">
      {/* Top bar */}
      <header className="pt-safe sticky top-0 z-30 px-4 pb-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <button onClick={() => navigate('/')} className="text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-glacier-400">Reed Apps</p>
            <p className="font-display text-xl leading-tight">{trip?.name ?? 'Trip Leader'}</p>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full glass-soft px-3 py-1.5 text-xs text-ice-200">
              <CalendarDays size={13} className="text-glacier-400" />
              {dayNo ? `Day ${dayNo}` : prettyShort(today)}
            </span>
            <span
              title={isSupabaseConfigured ? 'Synced' : 'Offline — saved on this device'}
              className={cx(
                'grid h-8 w-8 place-items-center rounded-full glass-soft',
                isSupabaseConfigured ? 'text-status-good' : 'text-ice-300/50',
              )}
            >
              {isSupabaseConfigured ? <Cloud size={15} /> : <CloudOff size={15} />}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-md px-4 pb-28">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto max-w-md px-4 pb-2">
          <div className="flex items-center justify-around rounded-2xl glass px-1.5 py-1.5">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-all',
                    isActive ? 'text-white' : 'text-ice-300/55',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cx(
                        'grid h-8 w-12 place-items-center rounded-lg transition-all',
                        isActive && 'btn-glacier',
                      )}
                    >
                      <Icon size={19} strokeWidth={2.2} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
