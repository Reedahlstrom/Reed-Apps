import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Shield, Plus, ChevronDown, Trash2, Pencil, UserPlus, X, MessageSquarePlus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Textarea, Field, EmptyState, IconButton } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import type { Committee } from '@/types/domain'
import { cx } from '@/lib/cx'

export function CommitteesPage() {
  const trip = useActiveTrip()
  const addCommittee = useTripStore((s) => s.addCommittee)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')

  if (!trip) return null

  const create = () => {
    if (name.trim()) addCommittee(name.trim(), purpose.trim())
    setName(''); setPurpose(''); setAdding(false)
  }

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="Committees" subtitle="Crews & responsibilities" icon={Shield} action={<IconButton icon={Plus} label="New committee" onClick={() => setAdding(true)} className="glass-soft" />} />

      {trip.committees.length === 0 ? (
        <EmptyState icon={Shield} title="No committees yet" body="Create crews like Devotional, Safety, or Games — give each a purpose and assign kids." action={<Button icon={Plus} onClick={() => setAdding(true)}>New committee</Button>} />
      ) : (
        <div className="space-y-2.5">
          {trip.committees.map((c) => (
            <CommitteeRow key={c.id} committee={c} open={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} />
          ))}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="New committee" footer={<Button full icon={Plus} onClick={create}>Create</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="Name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Devotional Crew" /></Field>
          <Field label="Responsibilities"><Textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What this crew is in charge of…" /></Field>
        </div>
      </Sheet>
    </div>
  )
}

function CommitteeRow({ committee: c, open, onToggle }: { committee: Committee; open: boolean; onToggle: () => void }) {
  const trip = useActiveTrip()!
  const update = useTripStore((s) => s.updateCommittee)
  const remove = useTripStore((s) => s.removeCommittee)
  const toggleMember = useTripStore((s) => s.toggleCommitteeMember)
  const addNote = useTripStore((s) => s.addCommitteeNote)
  const removeNote = useTripStore((s) => s.removeCommitteeNote)

  const [assignOpen, setAssignOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [note, setNote] = useState('')
  const [name, setName] = useState(c.name)
  const [purpose, setPurpose] = useState(c.purpose)

  const members = c.memberIds.map((id) => trip.people.find((p) => p.id === id)).filter(Boolean)
  const builders = trip.people.filter((p) => p.role === 'builder')

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl glass-soft text-glacier-400"><Shield size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] leading-tight">{c.name}</p>
          {c.purpose && <p className="truncate text-xs text-ice-300/55">{c.purpose}</p>}
        </div>
        <span className="num-chip rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ice-200">{members.length}</span>
        <ChevronDown size={18} className={cx('text-ice-300/50 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <div className="space-y-4 border-t hairline px-4 pb-4 pt-3">
              {c.purpose && <p className="text-sm leading-relaxed text-ice-200/80">{c.purpose}</p>}

              {/* members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-ice-300/60">Members · {members.length}</p>
                  <button onClick={() => setAssignOpen(true)} className="flex items-center gap-1 text-xs text-glacier-400"><UserPlus size={13} /> Assign</button>
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-ice-300/40">No one assigned yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {members.map((p) => (
                      <span key={p!.id} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-1 pr-1.5 text-sm">
                        <Avatar name={p!.name} role={p!.role} size={22} />{p!.name.split(' ')[0]}
                        <button onClick={() => toggleMember(c.id, p!.id)} className="grid h-5 w-5 place-items-center rounded-full text-ice-300/50 hover:text-status-bad"><X size={13} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* notes */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-ice-300/60">Notes</p>
                {c.notes.map((n) => (
                  <div key={n.id} className="flex items-start gap-2 rounded-xl glass-soft p-2.5">
                    <p className="flex-1 text-sm">{n.text}</p>
                    <button onClick={() => removeNote(c.id, n.id)} className="text-ice-300/40 hover:text-status-bad"><X size={14} /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { addNote(c.id, note); setNote('') } }} />
                  <Button icon={MessageSquarePlus} aria-label="Add note" onClick={() => { if (note.trim()) { addNote(c.id, note); setNote('') } }} />
                </div>
              </div>

              <div className="flex justify-end gap-1 border-t hairline pt-2">
                <IconButton icon={Pencil} label="Edit" onClick={() => { setName(c.name); setPurpose(c.purpose); setEditOpen(true) }} className="h-9 w-9" />
                <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => remove(c.id)} className="h-9 w-9" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* assign sheet */}
      <Sheet open={assignOpen} onClose={() => setAssignOpen(false)} title={`Assign to ${c.name}`}>
        <div className="space-y-2 pt-1">
          <p className="text-xs text-ice-300/55">Tap to add or remove builders.</p>
          <div className="flex flex-wrap gap-1.5">
            {builders.map((p) => {
              const on = c.memberIds.includes(p.id)
              return (
                <button key={p.id} onClick={() => toggleMember(c.id, p.id)} className={cx('flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-sm transition-all', on ? 'btn-glacier' : 'glass-soft text-ice-200')}>
                  <Avatar name={p.name} role={p.role} size={22} />{p.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      </Sheet>

      {/* edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit committee" footer={<Button full onClick={() => { update(c.id, { name: name.trim() || c.name, purpose }); setEditOpen(false) }}>Save</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Responsibilities"><Textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
        </div>
      </Sheet>
    </div>
  )
}
