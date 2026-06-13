import { useState } from 'react'
import {
  BookOpen,
  Plus,
  Sunrise,
  Moon,
  Check,
  Trash2,
  X,
  Compass,
  Scale,
  Target,
  BookMarked,
  User,
  CalendarDays,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Textarea, Field, Segmented, EmptyState, Card } from '@/components/ui'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyShort } from '@/lib/dates'
import type { DevoTime } from '@/types/domain'
import { cx } from '@/lib/cx'

export function DevotionalsPage() {
  const trip = useActiveTrip()
  const setBriefing = useTripStore((s) => s.setBriefing)
  const addDevotional = useTripStore((s) => s.addDevotional)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | DevoTime>('all')

  if (!trip) return null
  const list = trip.devotionals
    .filter((d) => (filter === 'all' ? true : d.time === filter))
    .sort((a, b) => (a.date ?? 'zzz').localeCompare(b.date ?? 'zzz'))

  const add = (time: DevoTime) => setOpenId(addDevotional(time))

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="Devotionals" subtitle="Plan together, share the vision" icon={BookOpen} />

      {/* Builder briefing — set the tone for the whole trip */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sand-500/15 text-sand-300"><Compass size={18} /></span>
          <div>
            <p className="font-display text-[15px] leading-tight">Builder Briefing</p>
            <p className="text-xs text-ice-300/55">The vision, rules &amp; expectations you both align on</p>
          </div>
        </div>
        <BriefingField icon={Compass} label="Vision" value={trip.briefing.vision} placeholder="Why we're here, what we're believing for…" onSave={(v) => setBriefing({ vision: v })} />
        <BriefingField icon={Scale} label="Rules" value={trip.briefing.rules} placeholder="Non-negotiables, boundaries, safety…" onSave={(v) => setBriefing({ rules: v })} />
        <BriefingField icon={Target} label="Expectations" value={trip.briefing.expectations} placeholder="What we expect of the builders and ourselves…" onSave={(v) => setBriefing({ expectations: v })} />
      </Card>

      {/* devotionals */}
      <div className="flex items-center gap-2">
        <div className="flex-1"><Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Night' }]} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="soft" icon={Sunrise} onClick={() => add('morning')}>Morning devo</Button>
        <Button variant="soft" icon={Moon} onClick={() => add('evening')}>Night devo</Button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={BookOpen} title="No devotionals planned" body="Add a morning or night devo — you don't need to plan them all, just stay on the same page." />
      ) : (
        <div className="space-y-2.5">
          {list.map((d) => (
            <button key={d.id} onClick={() => setOpenId(d.id)} className="glass w-full rounded-2xl p-4 text-left active:scale-[0.99]">
              <div className="flex items-center gap-2">
                <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', d.time === 'morning' ? 'bg-sand-500/15 text-sand-300' : 'bg-glacier-500/15 text-glacier-400')}>
                  {d.time === 'morning' ? <Sunrise size={17} /> : <Moon size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] leading-tight">{d.title || 'Untitled devo'}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-ice-300/55">
                    {d.giver && <span className="inline-flex items-center gap-1"><User size={11} /> {d.giver}</span>}
                    {d.date && <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {prettyShort(d.date)}</span>}
                  </p>
                </div>
                {d.done && <Check size={18} className="text-status-good" />}
              </div>
              {d.scriptures.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                  {d.scriptures.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full glass-soft px-2 py-0.5 text-xs text-ice-200"><BookMarked size={11} className="text-glacier-400" />{s}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {openId && <DevoSheet devoId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function BriefingField({ icon: Icon, label, value, placeholder, onSave }: { icon: typeof Compass; label: string; value: string; placeholder: string; onSave: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ice-300/70"><Icon size={12} className="text-sand-300" /> {label}</span>
      <Textarea rows={2} defaultValue={value} placeholder={placeholder} onBlur={(e) => onSave(e.target.value)} />
    </div>
  )
}

function DevoSheet({ devoId, onClose }: { devoId: string; onClose: () => void }) {
  const trip = useActiveTrip()!
  const update = useTripStore((s) => s.updateDevotional)
  const remove = useTripStore((s) => s.removeDevotional)
  const toggleDone = useTripStore((s) => s.toggleDevotionalDone)
  const d = trip.devotionals.find((x) => x.id === devoId)
  const [scripture, setScripture] = useState('')
  if (!d) return null

  const addScripture = () => {
    if (scripture.trim()) { update(devoId, { scriptures: [...d.scriptures, scripture.trim()] }); setScripture('') }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={d.time === 'morning' ? 'Morning devo' : 'Night devo'}
      footer={<div className="flex gap-2"><Button variant="soft" icon={d.done ? X : Check} onClick={() => toggleDone(devoId)}>{d.done ? 'Reopen' : 'Mark ready'}</Button><Button full onClick={onClose}>Done</Button></div>}
    >
      <div className="space-y-4 pt-1">
        <Segmented value={d.time} onChange={(v) => update(devoId, { time: v })} options={[{ value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Night' }]} />
        <Field label="Theme / topic"><Input autoFocus defaultValue={d.title} onBlur={(e) => update(devoId, { title: e.target.value })} placeholder="What it's about" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Who's giving it"><Input defaultValue={d.giver} onBlur={(e) => update(devoId, { giver: e.target.value })} placeholder="Name" /></Field>
          <Field label="When"><Input type="date" defaultValue={d.date ?? ''} onChange={(e) => update(devoId, { date: e.target.value || undefined })} /></Field>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-ice-300/70">Scriptures</p>
          {d.scriptures.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.scriptures.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-2.5 pr-1.5 text-sm"><BookMarked size={13} className="text-glacier-400" />{s}
                  <button onClick={() => update(devoId, { scriptures: d.scriptures.filter((_, j) => j !== i) })} className="grid h-5 w-5 place-items-center rounded-full text-ice-300/50 hover:text-status-bad"><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="e.g. Matthew 22:37-39" onKeyDown={(e) => e.key === 'Enter' && addScripture()} />
            <Button icon={Plus} aria-label="Add scripture" onClick={addScripture} />
          </div>
        </div>

        <Field label="Ideas & notes (shared)"><Textarea rows={5} defaultValue={d.ideas} onBlur={(e) => update(devoId, { ideas: e.target.value })} placeholder="Add your thoughts, illustrations, questions — you and your co both build this." /></Field>

        <button onClick={() => { remove(devoId); onClose() }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-status-bad/30 py-2.5 text-sm text-status-bad"><Trash2 size={15} /> Delete devo</button>
      </div>
    </Sheet>
  )
}
