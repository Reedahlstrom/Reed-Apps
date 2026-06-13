import { useEffect, useMemo, useState } from 'react'
import {
  MessagesSquare,
  Check,
  Clock,
  Circle,
  CalendarDays,
  Plus,
  X,
  ListTodo,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Textarea, Field, Segmented, EmptyState } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyShort } from '@/lib/dates'
import type { MeetingStatus, Person } from '@/types/domain'
import { cx } from '@/lib/cx'

const STATUS_META: Record<MeetingStatus, { label: string; icon: typeof Check; tone: string }> = {
  pending: { label: 'To do', icon: Circle, tone: 'text-ice-300/60' },
  scheduled: { label: 'Scheduled', icon: Clock, tone: 'text-glacier-400' },
  done: { label: 'Done', icon: Check, tone: 'text-status-good' },
}

export function MeetingsPage() {
  const trip = useActiveTrip()
  const syncMeetings = useTripStore((s) => s.syncMeetings)
  const [tab, setTab] = useState<MeetingStatus>('pending')
  const [openId, setOpenId] = useState<string | null>(null)
  const [followOpen, setFollowOpen] = useState(false)

  // keep a meeting row for every builder
  useEffect(() => { syncMeetings() }, [syncMeetings])

  if (!trip) return null
  const builders = trip.people.filter((p) => p.role === 'builder')
  const meetingFor = (id: string) => trip.meetings.find((m) => m.personId === id)
  const personFor = (id: string) => trip.people.find((p) => p.id === id)

  const counts = {
    pending: builders.filter((b) => (meetingFor(b.id)?.status ?? 'pending') === 'pending').length,
    scheduled: builders.filter((b) => meetingFor(b.id)?.status === 'scheduled').length,
    done: builders.filter((b) => meetingFor(b.id)?.status === 'done').length,
  }
  const openFollowUps = trip.meetings.flatMap((m) => m.followUps.filter((f) => !f.done).map((f) => ({ f, m })))

  const list = builders
    .filter((b) => (meetingFor(b.id)?.status ?? 'pending') === tab)
    .sort((a, b) => {
      const da = meetingFor(a.id)?.date ?? ''
      const db = meetingFor(b.id)?.date ?? ''
      return da === db ? a.name.localeCompare(b.name) : da < db ? -1 : 1
    })

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="2-on-1 Meetings" subtitle={`${counts.done} of ${builders.length} done`} icon={MessagesSquare} />

      {/* progress bar */}
      <div className="flex h-2 overflow-hidden rounded-full bg-white/8">
        <div className="bg-status-good transition-all" style={{ width: `${(counts.done / Math.max(1, builders.length)) * 100}%` }} />
        <div className="bg-glacier-500/70 transition-all" style={{ width: `${(counts.scheduled / Math.max(1, builders.length)) * 100}%` }} />
      </div>

      {openFollowUps.length > 0 && (
        <button onClick={() => setFollowOpen(true)} className="flex w-full items-center gap-2 rounded-xl glass-soft px-4 py-2.5 text-sm text-ice-200">
          <ListTodo size={15} className="text-glacier-400" /> {openFollowUps.length} open follow-up{openFollowUps.length > 1 ? 's' : ''}
          <ChevronRight size={16} className="ml-auto text-ice-300/40" />
        </button>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `To do · ${counts.pending}` },
          { value: 'scheduled', label: `Set · ${counts.scheduled}` },
          { value: 'done', label: `Done · ${counts.done}` },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon={tab === 'done' ? Check : MessagesSquare} title={tab === 'pending' ? 'Everyone is scheduled or done' : tab === 'done' ? 'None completed yet' : 'Nothing scheduled'} />
      ) : (
        <div className="space-y-2">
          {list.map((b) => {
            const m = meetingFor(b.id)
            const fuOpen = m?.followUps.filter((f) => !f.done).length ?? 0
            return (
              <button key={b.id} onClick={() => setOpenId(b.id)} className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]">
                <Avatar name={b.name} role={b.role} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">{b.name}</p>
                  {m?.date ? (
                    <p className="flex items-center gap-1 text-xs text-glacier-400"><CalendarDays size={12} /> {prettyShort(m.date)}</p>
                  ) : (
                    <p className="text-xs text-ice-300/45">No day set</p>
                  )}
                </div>
                {fuOpen > 0 && <span className="rounded-full bg-glacier-500/20 px-2 py-0.5 text-xs text-glacier-400">{fuOpen}</span>}
                <ChevronRight size={18} className="text-ice-300/40" />
              </button>
            )
          })}
        </div>
      )}

      {openId && <MeetingSheet personId={openId} onClose={() => setOpenId(null)} />}

      {/* all open follow-ups */}
      <Sheet open={followOpen} onClose={() => setFollowOpen(false)} title="Open follow-ups">
        <div className="space-y-2 pt-1">
          {openFollowUps.map(({ f, m }) => {
            const p = personFor(m.personId)
            return (
              <div key={f.id} className="glass flex items-start gap-3 rounded-2xl p-3">
                {p && <Avatar name={p.name} role={p.role} size={30} />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ice-300/60">{p?.name}</p>
                  <p className="text-sm">{f.text}</p>
                </div>
                <button onClick={() => useTripStore.getState().toggleFollowUp(m.personId, f.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-ice-300/20 text-ice-300/60 hover:text-status-good"><Check size={15} /></button>
              </div>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}

/* ---------------- per-kid detail ---------------- */

function MeetingSheet({ personId, onClose }: { personId: string; onClose: () => void }) {
  const trip = useActiveTrip()!
  const setStatus = useTripStore((s) => s.setMeetingStatus)
  const setDate = useTripStore((s) => s.setMeetingDate)
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
        <Segmented
          value={status}
          onChange={(v) => setStatus(personId, v)}
          options={(['pending', 'scheduled', 'done'] as MeetingStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))}
        />

        <Field label="Day">
          <Input type="date" value={meeting?.date ?? ''} onChange={(e) => setDate(personId, e.target.value || undefined)} />
        </Field>

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
