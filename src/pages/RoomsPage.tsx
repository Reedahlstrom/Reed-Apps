import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { BedDouble, Plus, Trash2, Copy, X, GripVertical, DoorOpen } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, EmptyState, Segmented, IconButton, Pill } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import type { Person, RoomPhase } from '@/types/domain'
import { cx } from '@/lib/cx'

const POOL_ID = 'pool'

export function RoomsPage() {
  const trip = useActiveTrip()
  const ensure = useTripStore((s) => s.ensureRoomPlan)
  const addRoom = useTripStore((s) => s.addRoom)
  const removeRoom = useTripStore((s) => s.removeRoom)
  const assign = useTripStore((s) => s.assignToRoom)
  const copyPlan = useTripStore((s) => s.copyRoomPlan)

  const [phase, setPhase] = useState<RoomPhase>('first')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [beds, setBeds] = useState('4')

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  )

  useEffect(() => { ensure('first') }, [ensure])

  if (!trip) return null
  const plan = trip.roomPlans.find((p) => p.phase === phase) ?? { phase, rooms: [] }
  const assignedIds = new Set(plan.rooms.flatMap((r) => r.occupants))
  const unassigned = trip.people.filter((p) => !assignedIds.has(p.id))
  const personById = (id: string) => trip.people.find((p) => p.id === id)
  const activePerson = activeId ? personById(activeId) : null

  const create = () => {
    ensure(phase)
    if (roomName.trim()) addRoom(phase, roomName.trim(), Math.max(1, parseInt(beds) || 1))
    setRoomName(''); setBeds('4'); setAdding(false)
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const personId = String(e.active.id)
    const over = e.over?.id ? String(e.over.id) : null
    if (!over) return
    if (over === POOL_ID) assign(phase, personId, null)
    else if (over.startsWith('room:')) assign(phase, personId, over.slice(5))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="space-y-5 pt-2">
        <PageHeader title="Rooms" subtitle={`${assignedIds.size} of ${trip.people.length} assigned`} icon={BedDouble} action={<IconButton icon={Plus} label="Add room" onClick={() => { ensure(phase); setAdding(true) }} className="glass-soft" />} />

        <Segmented value={phase} onChange={(v) => { ensure(v); setPhase(v) }} options={[{ value: 'first', label: 'First half' }, { value: 'second', label: 'Second half' }]} />

        {plan.rooms.length === 0 && phase === 'second' && (trip.roomPlans.find((p) => p.phase === 'first')?.rooms.length ?? 0) > 0 && (
          <Button full variant="soft" icon={Copy} onClick={() => copyPlan('first', 'second')}>Copy first-half rooms to start from</Button>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ice-300/60">
          <GripVertical size={13} /> Press and hold a name, then drag it into a room
        </p>

        {/* unassigned pool */}
        <Pool count={unassigned.length}>
          {unassigned.length === 0 ? (
            <p className="px-1 py-2 text-sm text-ice-300/40">Everyone is assigned</p>
          ) : (
            unassigned.map((p) => <DraggableChip key={p.id} person={p} dragging={activeId === p.id} />)
          )}
        </Pool>

        {plan.rooms.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No rooms yet" body="Add rooms with their bed counts, then drag everyone in." action={<Button icon={Plus} onClick={() => { ensure(phase); setAdding(true) }}>Add room</Button>} />
        ) : (
          <div className="space-y-2.5">
            {plan.rooms.map((room) => (
              <RoomDrop key={room.id} id={`room:${room.id}`} full={room.occupants.length >= room.beds}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl glass-soft text-glacier-500"><BedDouble size={17} /></span>
                  <span className="flex-1 font-display text-[15px]">{room.name}</span>
                  <Pill className={cx(room.occupants.length >= room.beds ? 'border-status-warn/30 text-status-warn' : '')}>{room.occupants.length}/{room.beds}</Pill>
                  <button onClick={() => removeRoom(phase, room.id)} className="text-status-bad/60 hover:text-status-bad"><Trash2 size={16} /></button>
                </div>
                {room.occupants.length === 0 ? (
                  <p className="px-1 text-sm text-ice-300/40">Drag people here</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {room.occupants.map((id) => {
                      const p = personById(id)
                      if (!p) return null
                      return (
                        <div key={id} className="flex items-center">
                          <DraggableChip person={p} dragging={activeId === p.id} compact />
                          <button onClick={() => assign(phase, id, null)} className="-ml-1 grid h-6 w-6 place-items-center rounded-full text-ice-300/40 hover:text-status-bad"><X size={13} /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </RoomDrop>
            ))}
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activePerson ? (
          <span className="flex items-center gap-1.5 rounded-full bg-night-900 py-1 pl-1 pr-3 text-sm shadow-xl ring-1 ring-glacier-500/50">
            <Avatar name={activePerson.name} role={activePerson.role} size={22} />{activePerson.name.split(' ')[0]}
          </span>
        ) : null}
      </DragOverlay>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add room" footer={<Button full icon={Plus} onClick={create}>Add room</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="Room name"><Input autoFocus value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Cabin A" onKeyDown={(e) => e.key === 'Enter' && create()} /></Field>
          <Field label="Beds"><Input type="number" inputMode="numeric" value={beds} onChange={(e) => setBeds(e.target.value)} /></Field>
        </div>
      </Sheet>
    </DndContext>
  )
}

function DraggableChip({ person, dragging, compact }: { person: Person; dragging: boolean; compact?: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: person.id })
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cx(
        'flex touch-none items-center gap-1.5 rounded-full py-1 pl-1 text-sm transition-all',
        compact ? 'glass-soft pr-2.5' : 'glass-soft pr-3',
        dragging ? 'opacity-30' : 'active:scale-95',
      )}
    >
      <Avatar name={person.name} role={person.role} size={22} />
      {person.name.split(' ')[0]}
    </button>
  )
}

function Pool({ count, children }: { count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID })
  return (
    <div ref={setNodeRef} className={cx('rounded-2xl border border-dashed p-3 transition-colors', isOver ? 'border-glacier-500/60 bg-glacier-500/5' : 'border-ice-300/25')}>
      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">Not assigned · {count}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function RoomDrop({ id, full, children }: { id: string; full: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cx('glass rounded-2xl p-4 transition-all', isOver && (full ? 'ring-2 ring-status-warn/50' : 'ring-2 ring-glacier-500/60'))}>
      {children}
    </div>
  )
}
