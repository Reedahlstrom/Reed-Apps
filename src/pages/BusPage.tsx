import { useMemo, useState } from 'react'
import {
  Users,
  Plus,
  ChevronLeft,
  Trash2,
  Lock,
  LockOpen,
  Shuffle,
  Sparkles,
  History,
  ArrowLeftRight,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, EmptyState, IconButton, Pill } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyShort, todayISO, tripDayNumber } from '@/lib/dates'
import { coOccurrence, timesTogether } from '@/lib/algorithms'
import type { BusDay } from '@/types/domain'
import { cx } from '@/lib/cx'

export function BusPage() {
  const trip = useActiveTrip()
  const generateBusDay = useTripStore((s) => s.generateBusDay)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [label, setLabel] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!trip) return null
  const selected = trip.busDays.find((d) => d.id === selectedId) ?? null
  if (selected) return <BusDayView day={selected} onBack={() => setSelectedId(null)} />

  const create = () => {
    const dayNo = tripDayNumber(date, trip.meta.startDate, trip.meta.endDate)
    generateBusDay(date, label.trim() || (dayNo ? `Day ${dayNo}` : prettyShort(date)))
    setAdding(false)
    setLabel('')
    // open the newest day
    setTimeout(() => {
      const newest = useTripStore.getState().trips.find((t) => t.id === trip.id)?.busDays.at(-1)
      if (newest) setSelectedId(newest.id)
    }, 0)
  }

  const lockedCount = trip.busDays.filter((d) => d.locked).length

  return (
    <div className="space-y-5 pt-2">
      <PageHeader
        title="Bus Buddies"
        subtitle="Fresh pairs daily, never a repeat"
        icon={Users}
        action={<IconButton icon={Plus} label="New day" onClick={() => { setDate(todayISO()); setAdding(true) }} className="glass-soft" />}
      />

      {trip.busDays.length > 0 && (
        <button onClick={() => setHistoryOpen(true)} className="flex w-full items-center gap-2 rounded-xl glass-soft px-4 py-2.5 text-sm text-ice-200">
          <History size={15} className="text-glacier-400" /> Who's sat with who
          <span className="ml-auto text-ice-300/50">{lockedCount} locked days</span>
        </button>
      )}

      {trip.busDays.length === 0 ? (
        <EmptyState icon={Users} title="No bus days yet" body="Generate today's pairs — everyone gets someone new, no repeats from locked days." action={<Button icon={Sparkles} onClick={() => setAdding(true)}>Generate pairs</Button>} />
      ) : (
        <div className="space-y-2.5">
          {[...trip.busDays].reverse().map((d) => (
            <button key={d.id} onClick={() => setSelectedId(d.id)} className="glass flex w-full items-center gap-3.5 rounded-2xl p-4 text-left active:scale-[0.99]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl glass-soft text-glacier-400"><Users size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] leading-tight">{d.label}</p>
                <p className="text-xs text-ice-300/55">{prettyShort(d.date)} · {d.pods.length} pairs</p>
              </div>
              {d.locked ? <Pill icon={Lock} className="border-status-good/30 bg-status-good/10 text-status-good">Locked</Pill> : <Pill icon={LockOpen}>Draft</Pill>}
            </button>
          ))}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="New bus day" footer={<Button full icon={Sparkles} onClick={create}>Generate pairs</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="Label"><Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Day 3 — to Santiago" /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <p className="text-xs text-ice-300/55">Pairs are built to avoid anyone you've already locked together. You can swap people, then lock it in.</p>
        </div>
      </Sheet>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}

/* ---------------- single day ---------------- */

function BusDayView({ day, onBack }: { day: BusDay; onBack: () => void }) {
  const trip = useActiveTrip()!
  const setBusPods = useTripStore((s) => s.setBusPods)
  const reshuffle = useTripStore((s) => s.reshuffleBusDay)
  const toggleLock = useTripStore((s) => s.toggleBusLock)
  const removeBusDay = useTripStore((s) => s.removeBusDay)
  const [picked, setPicked] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nameOf = (id: string) => trip.people.find((p) => p.id === id)?.name ?? '—'

  // history from OTHER locked days, to flag accidental repeats
  const counts = useMemo(
    () => coOccurrence(trip.busDays.filter((d) => d.locked && d.id !== day.id).map((d) => d.pods)),
    [trip.busDays, day.id],
  )

  const onTapPerson = (personId: string) => {
    if (day.locked) return
    if (!picked) {
      setPicked(personId)
      return
    }
    if (picked === personId) {
      setPicked(null)
      return
    }
    // swap the two people across pods
    const next = day.pods.map((pod) => pod.map((id) => (id === picked ? personId : id === personId ? picked : id)))
    setBusPods(day.id, next)
    setPicked(null)
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-2 pt-1">
        <IconButton icon={ChevronLeft} label="Back" onClick={onBack} className="-ml-2" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl leading-tight">{day.label}</h1>
          <p className="text-sm text-ice-300/60">{prettyShort(day.date)} · {day.pods.length} pairs</p>
        </div>
        <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setConfirmDelete(true)} />
      </div>

      {!day.locked && (
        <div className="flex items-center gap-2">
          <Button variant="soft" icon={Shuffle} onClick={() => { reshuffle(day.id); setPicked(null) }}>Reshuffle</Button>
          <Button full icon={Lock} onClick={() => toggleLock(day.id)}>Lock it in</Button>
        </div>
      )}
      {day.locked && (
        <button onClick={() => toggleLock(day.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-status-good/30 bg-status-good/10 py-2.5 text-sm text-status-good">
          <Lock size={15} /> Locked — tap to unlock &amp; edit
        </button>
      )}

      {!day.locked && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ice-300/55">
          <ArrowLeftRight size={13} /> {picked ? `Tap who to swap with ${nameOf(picked).split(' ')[0]}` : 'Tap two people to swap their seats'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {day.pods.map((pod, i) => {
          const repeat = pod.length === 2 && timesTogether(counts, pod[0], pod[1]) > 0
          return (
            <div key={i} className={cx('glass rounded-2xl p-3', repeat && 'ring-1 ring-status-warn/40')}>
              <div className="mb-2 flex items-center justify-between">
                <span className="num-chip text-xs text-ice-300/45">Seat {i + 1}</span>
                {pod.length === 3 && <Pill className="px-1.5 py-0 text-[10px]">trio</Pill>}
                {repeat && <Pill className="border-status-warn/30 bg-status-warn/10 px-1.5 py-0 text-[10px] text-status-warn">repeat</Pill>}
              </div>
              <div className="space-y-1.5">
                {pod.map((id) => (
                  <button
                    key={id}
                    onClick={() => onTapPerson(id)}
                    className={cx(
                      'flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-all',
                      picked === id ? 'btn-glacier' : 'hover:bg-slate-100',
                    )}
                  >
                    <Avatar name={nameOf(id)} size={26} />
                    <span className="truncate text-sm">{nameOf(id)}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this day?" footer={<div className="flex gap-2"><Button full variant="soft" onClick={() => setConfirmDelete(false)}>Keep</Button><Button full variant="danger" icon={Trash2} onClick={() => { removeBusDay(day.id); onBack() }}>Delete</Button></div>}>
        <p className="pt-1 text-[15px] text-ice-200">Removes {day.label}. If it was locked, its pairings stop counting toward avoiding repeats.</p>
      </Sheet>
    </div>
  )
}

/* ---------------- pairing history ---------------- */

function HistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trip = useActiveTrip()!
  const counts = useMemo(() => coOccurrence(trip.busDays.filter((d) => d.locked).map((d) => d.pods)), [trip.busDays])
  const nameOf = (id: string) => trip.people.find((p) => p.id === id)?.name ?? '—'

  return (
    <Sheet open={open} onClose={onClose} title="Who's sat with who">
      <div className="space-y-3 pt-1">
        <p className="text-xs text-ice-300/55">From locked days only. Used to keep new pairs fresh.</p>
        {trip.people.map((p) => {
          const buddies = trip.people
            .filter((o) => o.id !== p.id && timesTogether(counts, p.id, o.id) > 0)
            .map((o) => ({ o, n: timesTogether(counts, p.id, o.id) }))
          return (
            <div key={p.id} className="glass rounded-2xl p-3">
              <div className="mb-1.5 flex items-center gap-2"><Avatar name={p.name} role={p.role} size={28} /><span className="text-sm font-medium">{p.name}</span></div>
              {buddies.length === 0 ? (
                <p className="pl-9 text-xs text-ice-300/40">No one yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pl-9">
                  {buddies.map(({ o, n }) => (
                    <span key={o.id} className="rounded-full glass-soft px-2 py-0.5 text-xs text-ice-200">{nameOf(o.id).split(' ')[0]}{n > 1 ? ` ×${n}` : ''}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
