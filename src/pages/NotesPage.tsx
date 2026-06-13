import { useMemo, useState } from 'react'
import {
  NotebookPen,
  Plus,
  Search,
  Pin,
  PinOff,
  Phone,
  Pencil,
  Trash2,
  StickyNote,
  Contact,
  BellRing,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Textarea, Field, Segmented, EmptyState, IconButton } from '@/components/ui'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import type { Note, NoteCategory } from '@/types/domain'

const CAT_META: Record<NoteCategory, { label: string; icon: LucideIcon; tone: string }> = {
  note: { label: 'Note', icon: StickyNote, tone: 'text-glacier-400' },
  contact: { label: 'Contact', icon: Contact, tone: 'text-status-good' },
  reminder: { label: 'Reminder', icon: BellRing, tone: 'text-sand-300' },
}

type Filter = 'all' | NoteCategory

export function NotesPage() {
  const trip = useActiveTrip()
  const addNote = useTripStore((s) => s.addNote)
  const updateNote = useTripStore((s) => s.updateNote)
  const removeNote = useTripStore((s) => s.removeNote)
  const togglePin = useTripStore((s) => s.toggleNotePin)

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [adding, setAdding] = useState(false)

  // draft fields
  const [category, setCategory] = useState<NoteCategory>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [phone, setPhone] = useState('')

  const notes = useMemo(() => {
    if (!trip) return []
    const q = query.trim().toLowerCase()
    return trip.notes
      .filter((n) => (filter === 'all' ? true : n.category === filter))
      .filter((n) => (q ? (n.title + n.body + (n.phone ?? '')).toLowerCase().includes(q) : true))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.createdAt < b.createdAt ? 1 : -1))
  }, [trip, filter, query])

  if (!trip) return null

  const openAdd = () => { setCategory('note'); setTitle(''); setBody(''); setPhone(''); setAdding(true) }
  const openEdit = (n: Note) => { setCategory(n.category); setTitle(n.title); setBody(n.body); setPhone(n.phone ?? ''); setEditing(n) }
  const saveAdd = () => { if (title.trim() || body.trim()) addNote(category, title || 'Untitled', body, category === 'contact' ? phone : undefined); setAdding(false) }
  const saveEdit = () => { if (editing) updateNote(editing.id, { category, title: title || 'Untitled', body, phone: category === 'contact' ? phone : undefined }); setEditing(null) }

  const Form = (
    <div className="space-y-4 pt-1">
      <Segmented value={category} onChange={setCategory} options={(['note', 'contact', 'reminder'] as NoteCategory[]).map((c) => ({ value: c, label: CAT_META[c].label }))} />
      <Field label="Title"><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={category === 'contact' ? 'Name' : 'Title'} /></Field>
      {category === 'contact' && <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 …" inputMode="tel" /></Field>}
      <Field label={category === 'contact' ? 'Details' : 'Body'}><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write it down…" /></Field>
    </div>
  )

  return (
    <div className="space-y-4 pt-2">
      <PageHeader title="Notes" subtitle="Info, contacts, reminders" icon={NotebookPen} action={<IconButton icon={Plus} label="New note" onClick={openAdd} className="glass-soft" />} />

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-10" />
      </div>

      <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'note', label: 'Notes' }, { value: 'contact', label: 'Contacts' }, { value: 'reminder', label: 'Reminders' }]} />

      {notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title={query ? 'Nothing found' : 'No notes yet'} body={query ? undefined : 'Keep contacts, reminders and important info here.'} action={!query ? <Button icon={Plus} onClick={openAdd}>New note</Button> : undefined} />
      ) : (
        <div className="space-y-2.5">
          {notes.map((n) => {
            const meta = CAT_META[n.category]
            const Icon = meta.icon
            return (
              <div key={n.id} className="glass rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl glass-soft ${meta.tone}`}><Icon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 font-display text-[15px] leading-tight">{n.title}</p>
                      {n.pinned && <Pin size={13} className="text-sand-300" />}
                    </div>
                    {n.body && <p className="mt-1 whitespace-pre-wrap text-sm text-ice-200/80">{n.body}</p>}
                    {n.category === 'contact' && n.phone && (
                      <a href={`tel:${n.phone}`} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-status-good/15 px-2.5 py-1 text-sm text-status-good"><Phone size={13} /> {n.phone}</a>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 border-t hairline pt-2">
                  <IconButton icon={n.pinned ? PinOff : Pin} label="Pin" onClick={() => togglePin(n.id)} className="h-9 w-9" />
                  <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(n)} className="h-9 w-9" />
                  <IconButton icon={Trash2} label="Delete" tone="danger" onClick={() => removeNote(n.id)} className="h-9 w-9" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="New note" footer={<Button full onClick={saveAdd}>Save</Button>}>{Form}</Sheet>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Edit note" footer={<Button full onClick={saveEdit}>Save</Button>}>{Form}</Sheet>
    </div>
  )
}
