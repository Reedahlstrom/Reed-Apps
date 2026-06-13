import { useEffect, useState } from 'react'
import { BedDouble, Plus, Trash2, Copy, X, MoveRight, DoorOpen } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, EmptyState, Segmented, IconButton, Pill } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import type { RoomPhase } from '@/types/domain'
import { cx } from '@/lib/cx'

export function RoomsPage() {
  const trip = useActiveTrip()
  const ensure = useTripStore((s) => s.ensureRoomPlan)
  const addRoom = useTripStore((s) => s.addRoom)
  const removeRoom = useTripStore((s) => s.removeRoom)
  const assign = useTripStore((s) => s.assignToRoom)
  const copyPlan = useTripStore((s) => s.copyRoomPlan)

  const [phase, setPhase] = useState<RoomPhase>('first')
  const [picked, setPicked] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [beds, setBeds] = useState('4')

  useEffect(() => { ensure('first') }, [ensure])

  if (!trip) return null
  const plan = trip.roomPlans.find((p) => p.phase === phase) ?? { phase, rooms: [] }
  const assignedIds = new Set(plan.rooms.flatMap((r) => r.occupants))
  const unassigned = trip.people.filter((p) => !assignedIds.has(p.id))
  const nameOf = (id: string) => trip.people.find((p) => p.id === id)

  const create = () => {
    ensure(phase)
    if (roomName.trim()) addRoom(phase, roomName.trim(), Math.max(1, parseInt(beds) || 1))
    setRoomName('')
    setBeds('4')
    setAdding(false)
  }

  const placeInRoom = (roomId: string) => {
    if (picked) { assign(phase, picked, roomId); setPicked(null) }
  }

  return (
    <div className="space-y-5 pt-2">
      <PageHeader title="Rooms" subtitle={`${assignedIds.size} of ${trip.people.length} assigned`} icon={BedDouble} action={<IconButton icon={Plus} label="Add room" onClick={() => { ensure(phase); setAdding(true) }} className="glass-soft" />} />

      <Segmented value={phase} onChange={(v) => { ensure(v); setPhase(v); setPicked(null) }} options={[{ value: 'first', label: 'First half' }, { value: 'second', label: 'Second half' }]} />

      {plan.rooms.length === 0 && phase === 'second' && (trip.roomPlans.find((p) => p.phase === 'first')?.rooms.length ?? 0) > 0 && (
        <Button full variant="soft" icon={Copy} onClick={() => copyPlan('first', 'second')}>Copy first-half rooms to start from</Button>
      )}

      {/* unassigned pool */}
      {unassigned.length > 0 && (
        <div className="rounded-2xl border border-dashed border-ice-300/15 p-3">
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-ice-300/60">Not assigned · {unassigned.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((p) => (
              <button key={p.id} onClick={() => setPicked(picked === p.id ? null : p.id)} className={cx('flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-sm transition-all', picked === p.id ? 'btn-glacier' : 'glass-soft text-ice-200')}>
                <Avatar name={p.name} role={p.role} size={22} />{p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {picked && <p className="flex items-center justify-center gap-1.5 text-center text-xs text-glacier-400"><MoveRight size={13} /> Tap a room to move {nameOf(picked)?.name.split(' ')[0]} in</p>}

      {plan.rooms.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms yet" body="Add rooms with their bed counts, then assign everyone." action={<Button icon={Plus} onClick={() => { ensure(phase); setAdding(true) }}>Add room</Button>} />
      ) : (
        <div className="space-y-2.5">
          {plan.rooms.map((room) => {
            const full = room.occupants.length >= room.beds
            return (
              <div key={room.id} onClick={() => placeInRoom(room.id)} className={cx('glass rounded-2xl p-4', picked && !full && 'ring-1 ring-glacier-400/60', picked && full && 'opacity-60')}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl glass-soft text-glacier-400"><BedDouble size={17} /></span>
                  <span className="flex-1 font-display">{room.name}</span>
                  <Pill className={cx(full ? 'border-status-warn/30 text-status-warn' : '')}>{room.occupants.length}/{room.beds}</Pill>
                  <button onClick={(e) => { e.stopPropagation(); removeRoom(phase, room.id) }} className="text-status-bad/50 hover:text-status-bad"><Trash2 size={16} /></button>
                </div>
                {room.occupants.length === 0 ? (
                  <p className="pl-1 text-sm text-ice-300/40">{picked ? 'Tap to place here' : 'Empty'}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {room.occupants.map((id) => {
                      const p = nameOf(id)!
                      return (
                        <span key={id} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-1 pr-1 text-sm">
                          <Avatar name={p.name} role={p.role} size={22} />{p.name.split(' ')[0]}
                          <button onClick={(e) => { e.stopPropagation(); assign(phase, id, null) }} className="ml-0.5 grid h-5 w-5 place-items-center rounded-full text-ice-300/50 hover:text-status-bad"><X size={13} /></button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add room" footer={<Button full icon={Plus} onClick={create}>Add room</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="Room name"><Input autoFocus value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Cabin A" onKeyDown={(e) => e.key === 'Enter' && create()} /></Field>
          <Field label="Beds"><Input type="number" inputMode="numeric" value={beds} onChange={(e) => setBeds(e.target.value)} /></Field>
        </div>
      </Sheet>
    </div>
  )
}
