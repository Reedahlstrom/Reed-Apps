import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, CalendarRange, Check, Plus, Trash2, Luggage, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, Card } from '@/components/ui'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyDay } from '@/lib/dates'

export function SettingsPage() {
  const navigate = useNavigate()
  const trip = useActiveTrip()
  const trips = useTripStore((s) => s.trips)
  const activeId = useTripStore((s) => s.activeTripId)
  const renameTrip = useTripStore((s) => s.renameTrip)
  const updateTripMeta = useTripStore((s) => s.updateTripMeta)
  const setActiveTrip = useTripStore((s) => s.setActiveTrip)
  const createTrip = useTripStore((s) => s.createTrip)
  const deleteTrip = useTripStore((s) => s.deleteTrip)

  const [newOpen, setNewOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!trip) return null

  const save = (patch: Partial<typeof trip.meta>) => {
    updateTripMeta(patch)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  const startFresh = () => {
    // Default the next trip to the second window; onboard a clean roster.
    const id = createTrip('Trip 2', '2026-07-01', '2026-07-16', 'Patagonia & Concepción, Chile')
    setActiveTrip(id)
    setNewOpen(false)
    navigate('/trip/onboarding', { replace: true })
  }

  return (
    <div className="space-y-6 pt-2">
      <PageHeader title="Trip Settings" subtitle={trip.name} icon={Settings} />

      {/* trip details */}
      <Card className="space-y-4 p-4">
        <Field label="Trip name">
          <Input defaultValue={trip.name} onBlur={(e) => renameTrip(trip.id, e.target.value.trim() || trip.name)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start"><Input type="date" defaultValue={trip.meta.startDate} onChange={(e) => save({ startDate: e.target.value })} /></Field>
          <Field label="End"><Input type="date" defaultValue={trip.meta.endDate} onChange={(e) => save({ endDate: e.target.value })} /></Field>
        </div>
        <Field label="Destination">
          <Input defaultValue={trip.meta.destination} onBlur={(e) => save({ destination: e.target.value })} />
        </Field>
        <p className="flex items-center gap-2 text-xs text-ice-300/60">
          <CalendarRange size={14} className="text-glacier-400" />
          {prettyDay(trip.meta.startDate)} — {prettyDay(trip.meta.endDate)}
          {saved && <span className="ml-auto flex items-center gap-1 text-status-good"><Check size={13} /> Saved</span>}
        </p>
      </Card>

      {/* trips list */}
      <div className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">Trips</p>
        {trips.map((t) => (
          <div key={t.id} className={`glass flex items-center gap-3 rounded-2xl p-4 ${t.id === activeId ? 'ring-1 ring-glacier-400/50' : ''}`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl glass-soft text-glacier-400"><Luggage size={19} /></span>
            <button className="min-w-0 flex-1 text-left" onClick={() => setActiveTrip(t.id)}>
              <p className="font-display leading-tight">{t.name}</p>
              <p className="text-xs text-ice-300/55">{prettyDay(t.meta.startDate)} — {prettyDay(t.meta.endDate)} · {t.people.length} people</p>
            </button>
            {t.id === activeId ? (
              <span className="rounded-full bg-glacier-500/20 px-2.5 py-1 text-xs text-glacier-400">Active</span>
            ) : (
              <button onClick={() => setActiveTrip(t.id)} className="text-ice-300/50"><ChevronRight size={18} /></button>
            )}
            {trips.length > 1 && (
              <button onClick={() => setConfirmDelete(t.id)} className="text-status-bad/70 hover:text-status-bad"><Trash2 size={17} /></button>
            )}
          </div>
        ))}
      </div>

      <Button full variant="soft" icon={Plus} onClick={() => setNewOpen(true)}>Start a fresh trip</Button>

      {/* start fresh sheet */}
      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="Start a fresh trip" footer={<Button full icon={Plus} onClick={startFresh}>Create &amp; set up</Button>}>
        <p className="pt-1 text-[15px] leading-relaxed text-ice-200">
          This creates a brand-new trip with an empty roster and takes you through setup again. Your current trip
          (<span className="text-ice-50">{trip.name}</span>) stays saved and untouched — switch back to it any time.
        </p>
      </Sheet>

      {/* delete confirm */}
      <Sheet
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this trip?"
        footer={
          <div className="flex gap-2">
            <Button full variant="soft" onClick={() => setConfirmDelete(null)}>Keep it</Button>
            <Button full variant="danger" icon={Trash2} onClick={() => { if (confirmDelete) deleteTrip(confirmDelete); setConfirmDelete(null) }}>Delete</Button>
          </div>
        }
      >
        <p className="pt-1 text-[15px] leading-relaxed text-ice-200">
          This permanently removes <span className="text-ice-50">{trips.find((t) => t.id === confirmDelete)?.name}</span> and all its
          data — orders, pairings, meetings, notes, everything. This can't be undone.
        </p>
      </Sheet>
    </div>
  )
}
