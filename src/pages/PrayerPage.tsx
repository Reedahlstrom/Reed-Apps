import { useMemo, useState } from 'react'
import { HeartHandshake, Plus, Check, Trash2, Sparkles, HandHeart, Undo2, Search, X, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Textarea, Field, Segmented, EmptyState, IconButton } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import type { PrayerKind } from '@/types/domain'
import { cx } from '@/lib/cx'

type Filter = 'all' | PrayerKind

export function PrayerPage() {
  const trip = useActiveTrip()
  const addPrayer = useTripStore((s) => s.addPrayer)
  const toggleDone = useTripStore((s) => s.togglePrayerDone)
  const removePrayer = useTripStore((s) => s.removePrayer)

  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<PrayerKind>('prayer')
  const [text, setText] = useState('')
  const [personId, setPersonId] = useState<string | undefined>(undefined)
  const [personQuery, setPersonQuery] = useState('')

  const list = useMemo(() => {
    if (!trip) return []
    return trip.prayers
      .filter((p) => (filter === 'all' ? true : p.kind === filter))
      .sort((a, b) => Number(a.done) - Number(b.done) || (a.createdAt < b.createdAt ? 1 : -1))
  }, [trip, filter])

  if (!trip) return null
  const personOf = (id?: string) => (id ? trip.people.find((p) => p.id === id) : undefined)
  const openCount = trip.prayers.filter((p) => !p.done).length

  const save = () => {
    if (text.trim()) addPrayer(kind, text, personId)
    setText(''); setPersonId(undefined); setAdding(false)
  }
  const openAdd = (k: PrayerKind) => { setKind(k); setText(''); setPersonId(undefined); setPersonQuery(''); setAdding(true) }

  return (
    <div className="space-y-4 pt-2">
      <PageHeader title="Prayer & Praise" subtitle={openCount ? `${openCount} open` : 'Requests & shout-outs'} icon={HeartHandshake} />

      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="soft" icon={HandHeart} onClick={() => openAdd('prayer')}>Prayer request</Button>
        <Button variant="soft" icon={Sparkles} onClick={() => openAdd('shoutout')}>Shout-out</Button>
      </div>

      <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'prayer', label: 'Requests' }, { value: 'shoutout', label: 'Shout-outs' }]} />

      {list.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="Nothing yet" body="Jot down a prayer request or a shout-out — read them out at devo." />
      ) : (
        <div className="space-y-2.5">
          {list.map((p) => {
            const who = personOf(p.personId)
            const isPrayer = p.kind === 'prayer'
            return (
              <div key={p.id} className={cx('glass rounded-2xl p-3.5', p.done && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', isPrayer ? 'bg-glacier-500/15 text-glacier-500' : 'bg-sand-500/15 text-sand-500')}>
                    {isPrayer ? <HandHeart size={17} /> : <Sparkles size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {who && (
                      <p className="mb-0.5 flex items-center gap-1.5 text-xs text-ice-300/60"><Avatar name={who.name} role={who.role} size={16} /> {who.name}</p>
                    )}
                    <p className={cx('text-sm leading-snug', p.done && 'line-through')}>{p.text}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 border-t hairline pt-2">
                  <button onClick={() => toggleDone(p.id)} className={cx('flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium', p.done ? 'text-ice-300/60' : 'text-status-good')}>
                    {p.done ? <><Undo2 size={13} /> Reopen</> : <><Check size={13} /> {isPrayer ? 'Answered' : 'Shared'}</>}
                  </button>
                  <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => removePrayer(p.id)} className="h-8 w-8" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title={kind === 'prayer' ? 'Prayer request' : 'Shout-out'} footer={<Button full icon={Plus} onClick={save} disabled={!text.trim()}>Add</Button>}>
        <div className="space-y-4 pt-1">
          <Segmented value={kind} onChange={setKind} options={[{ value: 'prayer', label: 'Prayer request' }, { value: 'shoutout', label: 'Shout-out' }]} />
          <Field label={kind === 'prayer' ? 'What to pray for' : 'The encouragement'}>
            <Textarea autoFocus rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'prayer' ? 'e.g. Maddie’s grandma is in the hospital' : 'e.g. Joshua led the worksite cleanup unprompted'} />
          </Field>
          <Field label="Who's it about? (optional)">
            {personOf(personId) ? (
              <div className="flex items-center gap-2.5 rounded-xl glass-soft p-2.5">
                <Avatar name={personOf(personId)!.name} role={personOf(personId)!.role} size={32} />
                <span className="flex-1 font-medium">{personOf(personId)!.name}</span>
                <button onClick={() => { setPersonId(undefined); setPersonQuery('') }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-ice-300/70 hover:text-status-bad">
                  <X size={15} /> Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
                  <input value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder="Tap a name to tag them" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[16px] text-ice-50 placeholder:text-ice-300/45 outline-none focus:border-glacier-500" />
                </div>
                <div className="no-scrollbar max-h-44 space-y-1 overflow-y-auto">
                  {trip.people
                    .filter((p) => p.name.toLowerCase().includes(personQuery.trim().toLowerCase()))
                    .map((p) => (
                      <button key={p.id} onClick={() => setPersonId(p.id)} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left hover:bg-slate-100 active:scale-[0.99]">
                        <Avatar name={p.name} role={p.role} size={30} />
                        <span className="flex-1 text-[15px]">{p.name}</span>
                        <UserPlus size={15} className="text-glacier-500" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </Field>
        </div>
      </Sheet>
    </div>
  )
}
