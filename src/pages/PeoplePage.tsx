import { useState } from 'react'
import { Users2, Plus, Pencil, Trash2, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, Segmented, EmptyState, IconButton } from '@/components/ui'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { ROLE_LABELS, type Person, type Role } from '@/types/domain'

const ROLE_ORDER: Role[] = ['leader', 'coleader', 'parent', 'builder']
const ROLE_OPTIONS = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r] }))

export function PeoplePage() {
  const trip = useActiveTrip()
  const addPerson = useTripStore((s) => s.addPerson)
  const updatePerson = useTripStore((s) => s.updatePerson)
  const removePerson = useTripStore((s) => s.removePerson)

  const [editing, setEditing] = useState<Person | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('builder')

  if (!trip) return null

  const openAdd = () => {
    setName('')
    setRole('builder')
    setAdding(true)
  }
  const openEdit = (p: Person) => {
    setName(p.name)
    setRole(p.role)
    setEditing(p)
  }
  const saveAdd = () => {
    if (name.trim()) addPerson(name.trim(), role)
    setAdding(false)
  }
  const saveEdit = () => {
    if (editing && name.trim()) updatePerson(editing.id, { name: name.trim(), role })
    setEditing(null)
  }

  return (
    <div className="space-y-5 pt-2">
      <PageHeader
        title="Roster"
        subtitle={`${trip.people.length} on the trip`}
        icon={Users2}
        action={<IconButton icon={Plus} label="Add person" onClick={openAdd} className="glass-soft" />}
      />

      {trip.people.length === 0 ? (
        <EmptyState icon={UserPlus} title="No one yet" body="Add the people on your trip." action={<Button icon={Plus} onClick={openAdd}>Add person</Button>} />
      ) : (
        ROLE_ORDER.map((r) => {
          const group = trip.people.filter((p) => p.role === r)
          if (group.length === 0) return null
          return (
            <div key={r} className="space-y-2">
              <p className="px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">
                {ROLE_LABELS[r]}
                {group.length > 1 ? 's' : ''} · {group.length}
              </p>
              <div className="space-y-2">
                {group.map((p) => (
                  <div key={p.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                    <Avatar name={p.name} role={p.role} size={40} />
                    <p className="flex-1 font-medium">{p.name}</p>
                    <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(p)} />
                    <IconButton icon={Trash2} label="Remove" tone="danger" onClick={() => removePerson(p.id)} />
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Add sheet */}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add person" footer={<Button full onClick={saveAdd} disabled={!name.trim()}>Add to trip</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="Name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" onKeyDown={(e) => e.key === 'Enter' && saveAdd()} /></Field>
          <Field label="Role"><Segmented options={ROLE_OPTIONS} value={role} onChange={setRole} /></Field>
        </div>
      </Sheet>

      {/* Edit sheet */}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit person"
        footer={
          <div className="flex gap-2">
            <Button variant="danger" icon={Trash2} onClick={() => { if (editing) removePerson(editing.id); setEditing(null) }}>Remove</Button>
            <Button full onClick={saveEdit} disabled={!name.trim()}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <Field label="Name"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Role"><Segmented options={ROLE_OPTIONS} value={role} onChange={setRole} /></Field>
        </div>
      </Sheet>
    </div>
  )
}
