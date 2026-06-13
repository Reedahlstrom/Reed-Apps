import { useEffect, useState } from 'react'
import { Activity, Check, CalendarDays, ShieldAlert, ShieldCheck, CircleDot } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Segmented, Card } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { todayISO } from '@/lib/dates'
import { poopStatusFor, POOP_COPY, type PoopLevel } from '@/lib/health'
import { cx } from '@/lib/cx'

const LEVEL_STYLE: Record<PoopLevel, { ring: string; text: string; bg: string; icon: typeof Check }> = {
  good: { ring: 'ring-status-good/40', text: 'text-status-good', bg: 'bg-status-good/10', icon: ShieldCheck },
  warn: { ring: 'ring-status-warn/40', text: 'text-status-warn', bg: 'bg-status-warn/10', icon: CircleDot },
  bad: { ring: 'ring-status-bad/50', text: 'text-status-bad', bg: 'bg-status-bad/12', icon: ShieldAlert },
}

export function PoopPage() {
  const trip = useActiveTrip()
  const setPoopNight = useTripStore((s) => s.setPoopNight)
  const togglePoop = useTripStore((s) => s.togglePoop)
  const [tab, setTab] = useState<'tonight' | 'status'>('tonight')
  const [date, setDate] = useState(todayISO())

  // Ensure the selected night exists so "everyone else went" is recorded even
  // when no one is flagged — this keeps the streak math honest.
  useEffect(() => {
    if (tab !== 'tonight' || !trip) return
    if (!trip.poopNights.some((n) => n.date === date)) setPoopNight(date, [])
  }, [tab, date, trip, setPoopNight])

  if (!trip) return null
  const night = trip.poopNights.find((n) => n.date === date)
  const notPooped = new Set(night?.notPooped ?? [])

  const statuses = trip.people
    .map((p) => ({ p, s: poopStatusFor(p.id, trip.poopNights, todayISO()) }))
    .sort((a, b) => b.s.days - a.s.days || a.p.name.localeCompare(b.p.name))
  const concern = statuses.filter((x) => x.s.level !== 'good')

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="Health Check" subtitle="Nightly heads-up, sevens-up" icon={Activity} />

      <Segmented value={tab} onChange={setTab} options={[{ value: 'tonight', label: 'Tonight' }, { value: 'status', label: `Status${concern.length ? ` · ${concern.length}` : ''}` }]} />

      {tab === 'tonight' ? (
        <>
          <div className="flex items-center gap-2 rounded-xl glass-soft px-3 py-2">
            <CalendarDays size={16} className="text-glacier-400" />
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="flex-1 bg-transparent text-[15px] text-ice-100 outline-none" />
            <span className="flex items-center gap-1 text-xs text-status-good"><Check size={13} /> Checked</span>
          </div>
          <p className="px-1 text-sm text-ice-300/60">Tap anyone who <span className="text-status-bad">didn't go</span> today. Everyone else is logged as fine.</p>

          <div className="space-y-2">
            {trip.people.map((p) => {
              const missed = notPooped.has(p.id)
              return (
                <button key={p.id} onClick={() => togglePoop(date, p.id)} className={cx('flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all', missed ? 'border border-status-bad/40 bg-status-bad/12' : 'glass')}>
                  <Avatar name={p.name} role={p.role} size={38} />
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className={cx('grid h-7 w-7 place-items-center rounded-full border transition-all', missed ? 'border-status-bad bg-status-bad/20 text-status-bad' : 'border-ice-300/25 text-transparent')}>
                    <Check size={15} />
                  </span>
                </button>
              )
            })}
          </div>
          <p className="pb-2 text-center text-xs text-ice-300/45">{notPooped.size} marked as didn't go tonight</p>
        </>
      ) : (
        <div className="space-y-4">
          {concern.length > 0 && (
            <Card className="space-y-1 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-status-bad/80">Keep an eye on</p>
              {concern.map(({ p, s }) => (
                <p key={p.id} className="text-sm text-ice-100">
                  <span className="font-medium">{p.name}</span> hasn't gone in <span className={LEVEL_STYLE[s.level].text}>{s.days} day{s.days !== 1 ? 's' : ''}</span>
                  {s.level === 'bad' && <span className="text-status-bad"> — not good</span>}
                </p>
              ))}
            </Card>
          )}

          <div className="space-y-2">
            {statuses.map(({ p, s }) => {
              const st = LEVEL_STYLE[s.level]
              const Icon = st.icon
              return (
                <div key={p.id} className={cx('glass flex items-center gap-3 rounded-2xl p-3 ring-1', st.ring)}>
                  <Avatar name={p.name} role={p.role} size={38} />
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{p.name}</p>
                    <p className={cx('text-xs', st.text)}>{s.days === 0 ? POOP_COPY.good : `${s.days} day${s.days !== 1 ? 's' : ''}`}</p>
                  </div>
                  <span className={cx('grid h-8 w-8 place-items-center rounded-full', st.bg, st.text)}><Icon size={17} /></span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
