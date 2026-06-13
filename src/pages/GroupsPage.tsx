import { useState } from 'react'
import { Boxes, Plus, ChevronLeft, Trash2, Lock, LockOpen, Shuffle, Sparkles, ArrowLeftRight, Minus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, EmptyState, IconButton, Pill } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyShort } from '@/lib/dates'
import type { GroupSet } from '@/types/domain'
import { cx } from '@/lib/cx'

export function GroupsPage() {
  const trip = useActiveTrip()
  const generate = useTripStore((s) => s.generateGroupSet)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [activity, setActivity] = useState('')
  const [num, setNum] = useState(4)

  if (!trip) return null
  const selected = trip.groupSets.find((g) => g.id === selectedId) ?? null
  if (selected) return <GroupSetView set={selected} onBack={() => setSelectedId(null)} />

  const create = () => {
    generate(label.trim() || 'Groups', num, activity.trim() || undefined)
    setLabel(''); setActivity(''); setAdding(false)
    setTimeout(() => {
      const newest = useTripStore.getState().trips.find((t) => t.id === trip.id)?.groupSets[0]
      if (newest) setSelectedId(newest.id)
    }, 0)
  }

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="Groups" subtitle="Auto-balanced, mixed up each time" icon={Boxes} action={<IconButton icon={Plus} label="New groups" onClick={() => setAdding(true)} className="glass-soft" />} />

      {trip.groupSets.length === 0 ? (
        <EmptyState icon={Boxes} title="No groups yet" body="Pick how many groups — everyone is split evenly and mixed away from past locked groups." action={<Button icon={Sparkles} onClick={() => setAdding(true)}>Make groups</Button>} />
      ) : (
        <div className="space-y-2.5">
          {trip.groupSets.map((g) => (
            <button key={g.id} onClick={() => setSelectedId(g.id)} className="glass flex w-full items-center gap-3.5 rounded-2xl p-4 text-left active:scale-[0.99]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl glass-soft text-glacier-400"><Boxes size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] leading-tight">{g.label}</p>
                <p className="truncate text-xs text-ice-300/55">{g.activity ? `${g.activity} · ` : ''}{g.groups.length} groups · {prettyShort(g.createdAt.slice(0, 10))}</p>
              </div>
              {g.locked ? <Pill icon={Lock} className="border-status-good/30 bg-status-good/10 text-status-good">Locked</Pill> : <Pill icon={LockOpen}>Draft</Pill>}
            </button>
          ))}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="New groups" footer={<Button full icon={Sparkles} onClick={create}>Make groups</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="What for"><Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Worksite teams" /></Field>
          <Field label="Activity (optional)"><Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Classroom build" /></Field>
          <Field label="How many groups">
            <div className="flex items-center justify-between rounded-xl glass-soft p-2">
              <IconButton icon={Minus} label="Fewer" onClick={() => setNum((n) => Math.max(2, n - 1))} />
              <span className="num-chip text-2xl">{num}</span>
              <IconButton icon={Plus} label="More" onClick={() => setNum((n) => Math.min(trip.people.length, n + 1))} />
            </div>
          </Field>
          <p className="text-center text-xs text-ice-300/55">≈ {Math.ceil(trip.people.length / num)} people per group</p>
        </div>
      </Sheet>
    </div>
  )
}

/* ---------------- one set ---------------- */

function GroupSetView({ set, onBack }: { set: GroupSet; onBack: () => void }) {
  const trip = useActiveTrip()!
  const setGroups = useTripStore((s) => s.setGroups)
  const reshuffle = useTripStore((s) => s.reshuffleGroupSet)
  const toggleLock = useTripStore((s) => s.toggleGroupLock)
  const remove = useTripStore((s) => s.removeGroupSet)
  const [picked, setPicked] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nameOf = (id: string) => trip.people.find((p) => p.id === id)

  const onTap = (personId: string) => {
    if (set.locked) return
    if (!picked) { setPicked(personId); return }
    if (picked === personId) { setPicked(null); return }
    const next = set.groups.map((g) => g.map((id) => (id === picked ? personId : id === personId ? picked : id)))
    setGroups(set.id, next)
    setPicked(null)
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-2 pt-1">
        <IconButton icon={ChevronLeft} label="Back" onClick={onBack} className="-ml-2" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl leading-tight">{set.label}</h1>
          <p className="truncate text-sm text-ice-300/60">{set.activity ? `${set.activity} · ` : ''}{set.groups.length} groups</p>
        </div>
        <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => setConfirmDelete(true)} />
      </div>

      {!set.locked ? (
        <div className="flex items-center gap-2">
          <Button variant="soft" icon={Shuffle} onClick={() => { reshuffle(set.id, set.groups.length); setPicked(null) }}>Reshuffle</Button>
          <Button full icon={Lock} onClick={() => toggleLock(set.id)}>Lock it in</Button>
        </div>
      ) : (
        <button onClick={() => toggleLock(set.id)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-status-good/30 bg-status-good/10 py-2.5 text-sm text-status-good"><Lock size={15} /> Locked — tap to unlock &amp; edit</button>
      )}

      {!set.locked && <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ice-300/55"><ArrowLeftRight size={13} /> {picked ? `Tap who to swap with ${nameOf(picked)?.name.split(' ')[0]}` : 'Tap two people to swap groups'}</p>}

      <div className="space-y-2.5">
        {set.groups.map((group, i) => (
          <div key={i} className="glass rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="num-chip grid h-7 w-7 place-items-center rounded-lg btn-glacier text-sm">{i + 1}</span>
              <span className="font-display text-[15px]">Group {i + 1}</span>
              <span className="num-chip ml-auto text-ice-300/50">{group.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.map((id) => {
                const p = nameOf(id)!
                return (
                  <button key={id} onClick={() => onTap(id)} className={cx('flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-sm transition-all', picked === id ? 'btn-glacier' : 'glass-soft text-ice-200')}>
                    <Avatar name={p.name} role={p.role} size={22} />{p.name.split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete these groups?" footer={<div className="flex gap-2"><Button full variant="soft" onClick={() => setConfirmDelete(false)}>Keep</Button><Button full variant="danger" icon={Trash2} onClick={() => { remove(set.id); onBack() }}>Delete</Button></div>}>
        <p className="pt-1 text-[15px] text-ice-200">Removes {set.label}.</p>
      </Sheet>
    </div>
  )
}
