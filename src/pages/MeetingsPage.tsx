import { useEffect, useMemo, useState } from 'react'
import {
  MessagesSquare,
  Check,
  X,
  Plus,
  CalendarClock,
  ListTodo,
  CalendarPlus,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Textarea, Field, Segmented } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { tripDays, prettyShort, dayNum, weekday, parse, todayISO } from '@/lib/dates'
import type { MeetingStatus, Person } from '@/types/domain'
import { cx } from '@/lib/cx'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MeetingsPage() {
  const trip = useActiveTrip()
  const syncMeetings = useTripStore((s) => s.syncMeetings)
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const [detailFor, setDetailFor] = useState<string | null>(null)
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)

  useEffect(() => { syncMeetings() }, [syncMeetings])

  if (!trip) return null
  const today = todayISO()
  const builders = trip.people.filter((p) => p.role === 'builder')
  const meetingFor = (id: string) => trip.meetings.find((m) => m.personId === id)
  const personFor = (id: string) => trip.people.find((p) => p.id === id)

  const days = tripDays(trip.meta.startDate, trip.meta.endDate)
  const leadOffset = days.length ? parse(days[0]).getDay() : 0

  const buildersOnDay = (iso: string) => builders.filter((b) => meetingFor(b.id)?.date === iso)
  const unscheduled = builders.filter((b) => !meetingFor(b.id)?.date)
  const missed = builders.filter((b) => {
    const m = meetingFor(b.id)
    return m?.date && m.date < today && m.status !== 'done'
  })
  const doneCount = builders.filter((b) => meetingFor(b.id)?.status === 'done').length

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="2-on-1 Meetings" subtitle={`${doneCount} of ${builders.length} done`} icon={MessagesSquare} />

      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div className="h-full bg-status-good transition-all" style={{ width: `${(doneCount / Math.max(1, builders.length)) * 100}%` }} />
      </div>

      {/* calendar */}
      <div className="glass rounded-2xl p-3">
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-ice-300/50">
          {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadOffset }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((iso) => {
            const on = buildersOnDay(iso)
            const allDone = on.length > 0 && on.every((b) => meetingFor(b.id)?.status === 'done')
            const isToday = iso === today
            const hasMissed = on.some((b) => iso < today && meetingFor(b.id)?.status !== 'done')
            return (
              <button
                key={iso}
                onClick={() => setDayOpen(iso)}
                className={cx(
                  'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-all active:scale-95',
                  on.length ? 'glass-soft' : 'hover:bg-slate-100',
                  isToday && 'ring-2 ring-glacier-500/60',
                )}
              >
                <span className={cx('num-chip leading-none', isToday ? 'text-glacier-600' : 'text-ice-200')}>{dayNum(iso)}</span>
                {on.length > 0 && (
                  <span className={cx('num-chip rounded-full px-1.5 text-[10px] leading-tight', allDone ? 'bg-status-good/15 text-status-good' : hasMissed ? 'bg-status-bad/15 text-status-bad' : 'bg-glacier-500/15 text-glacier-600')}>
                    {on.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* missed → reschedule */}
      {missed.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-status-bad/80">Missed · {missed.length}</p>
          {missed.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-status-bad/30 bg-status-bad/8 p-3">
              <Avatar name={b.name} role={b.role} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{b.name}</p>
                <p className="text-xs text-status-bad">was {prettyShort(meetingFor(b.id)!.date!)}</p>
              </div>
              <Button variant="soft" icon={CalendarClock} onClick={() => setScheduleFor(b.id)}>Reschedule</Button>
            </div>
          ))}
        </div>
      )}

      {/* not scheduled */}
      {unscheduled.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">
            <ListTodo size={13} /> Not scheduled · {unscheduled.length}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unscheduled.map((b) => (
              <button key={b.id} onClick={() => setScheduleFor(b.id)} className="flex items-center gap-1.5 rounded-full glass py-1 pl-1 pr-3 text-sm active:scale-95">
                <Avatar name={b.name} role={b.role} size={24} />{b.name}<CalendarPlus size={13} className="text-glacier-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* day sheet */}
      <Sheet open={!!dayOpen} onClose={() => setDayOpen(null)} title={dayOpen ? `${weekday(dayOpen)}, ${prettyShort(dayOpen).split(', ')[1]}` : ''}>
        {dayOpen && <DaySheet iso={dayOpen} onDetail={(id) => { setDayOpen(null); setDetailFor(id) }} />}
      </Sheet>

      {/* schedule / reschedule picker */}
      <Sheet open={!!scheduleFor} onClose={() => setScheduleFor(null)} title={scheduleFor ? `When for ${personFor(scheduleFor)?.name.split(' ')[0]}?` : ''}>
        {scheduleFor && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {days.map((iso) => {
              const count = buildersOnDay(iso).length
              return (
                <button
                  key={iso}
                  onClick={() => { useTripStore.getState().setMeetingDate(scheduleFor, iso); setScheduleFor(null) }}
                  className="glass flex items-center justify-between rounded-xl p-3 text-left active:scale-[0.98]"
                >
                  <span><span className="num-chip text-ice-100">{weekday(iso)} {dayNum(iso)}</span></span>
                  {count > 0 && <span className="num-chip rounded-full bg-slate-100 px-2 text-xs text-ice-300/60">{count}</span>}
                </button>
              )
            })}
          </div>
        )}
      </Sheet>

      {detailFor && <MeetingSheet personId={detailFor} onClose={() => setDetailFor(null)} />}
    </div>
  )
}

/* ---------------- one day ---------------- */

function DaySheet({ iso, onDetail }: { iso: string; onDetail: (personId: string) => void }) {
  const trip = useActiveTrip()!
  const setStatus = useTripStore((s) => s.setMeetingStatus)
  const setDate = useTripStore((s) => s.setMeetingDate)
  const builders = trip.people.filter((p) => p.role === 'builder')
  const meetingFor = (id: string) => trip.meetings.find((m) => m.personId === id)
  const onDay = builders.filter((b) => meetingFor(b.id)?.date === iso)
  const free = builders.filter((b) => !meetingFor(b.id)?.date)
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-4 pt-1">
      {onDay.length === 0 ? (
        <p className="text-sm text-ice-300/55">No one scheduled this day yet.</p>
      ) : (
        <div className="space-y-2">
          {onDay.map((b) => {
            const m = meetingFor(b.id)!
            const done = m.status === 'done'
            return (
              <div key={b.id} className="flex items-center gap-2.5 rounded-2xl glass p-2.5">
                <button onClick={() => setStatus(b.id, done ? 'scheduled' : 'done')} className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full border', done ? 'border-status-good bg-status-good/20 text-status-good' : 'border-ice-300/30 text-transparent')}>
                  <Check size={15} />
                </button>
                <button onClick={() => onDetail(b.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <Avatar name={b.name} role={b.role} size={32} />
                  <span className={cx('truncate font-medium', done && 'text-ice-300/50 line-through')}>{b.name}</span>
                </button>
                <button onClick={() => setDate(b.id, undefined)} className="grid h-7 w-7 place-items-center rounded-full text-ice-300/40 hover:text-status-bad"><X size={15} /></button>
              </div>
            )
          })}
        </div>
      )}

      {free.length > 0 && (
        adding ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-ice-300/60">Add to this day</p>
            <div className="flex flex-wrap gap-1.5">
              {free.map((b) => (
                <button key={b.id} onClick={() => setDate(b.id, iso)} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-1 pr-3 text-sm active:scale-95">
                  <Avatar name={b.name} role={b.role} size={22} />{b.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <Button full variant="soft" icon={Plus} onClick={() => setAdding(true)}>Add builders to this day</Button>
        )
      )}
    </div>
  )
}

/* ---------------- per-kid detail (notes + follow-ups) ---------------- */

function MeetingSheet({ personId, onClose }: { personId: string; onClose: () => void }) {
  const trip = useActiveTrip()!
  const setStatus = useTripStore((s) => s.setMeetingStatus)
  const setNotes = useTripStore((s) => s.setMeetingNotes)
  const addFollowUp = useTripStore((s) => s.addFollowUp)
  const toggleFollowUp = useTripStore((s) => s.toggleFollowUp)
  const removeFollowUp = useTripStore((s) => s.removeFollowUp)

  const person = trip.people.find((p) => p.id === personId) as Person
  const meeting = trip.meetings.find((m) => m.personId === personId)
  const [fu, setFu] = useState('')
  const status = meeting?.status ?? 'pending'
  const followUps = useMemo(() => meeting?.followUps ?? [], [meeting])

  return (
    <Sheet open onClose={onClose} title={person?.name}>
      <div className="space-y-5 pt-1">
        <Segmented value={status} onChange={(v) => setStatus(personId, v)} options={(['pending', 'scheduled', 'done'] as MeetingStatus[]).map((s) => ({ value: s, label: s === 'pending' ? 'To do' : s === 'scheduled' ? 'Set' : 'Done' }))} />
        {meeting?.date && <p className="text-sm text-ice-300/60">Scheduled for {prettyShort(meeting.date)}</p>}
        <Field label="Notes from the conversation">
          <Textarea rows={4} defaultValue={meeting?.notes ?? ''} onBlur={(e) => setNotes(personId, e.target.value)} placeholder="What you talked about, how they're doing…" />
        </Field>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ice-300/70">Follow up on</p>
          {followUps.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5">
              <button onClick={() => toggleFollowUp(personId, f.id)} className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-md border', f.done ? 'border-status-good bg-status-good/20 text-status-good' : 'border-ice-300/25 text-transparent')}><Check size={14} /></button>
              <span className={cx('flex-1 text-sm', f.done && 'text-ice-300/40 line-through')}>{f.text}</span>
              <button onClick={() => removeFollowUp(personId, f.id)} className="text-status-bad/50 hover:text-status-bad"><X size={15} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={fu} onChange={(e) => setFu(e.target.value)} placeholder="Add a follow-up" onKeyDown={(e) => { if (e.key === 'Enter' && fu.trim()) { addFollowUp(personId, fu); setFu('') } }} />
            <Button icon={Plus} aria-label="Add follow-up" onClick={() => { if (fu.trim()) { addFollowUp(personId, fu); setFu('') } }} />
          </div>
        </div>
      </div>
    </Sheet>
  )
}
