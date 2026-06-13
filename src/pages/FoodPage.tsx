import { useMemo, useState } from 'react'
import {
  UtensilsCrossed,
  Plus,
  ChevronLeft,
  Trash2,
  Store,
  ListChecks,
  X,
  CalendarDays,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Button, Input, Field, EmptyState, IconButton, Segmented, Card } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyShort, todayISO } from '@/lib/dates'
import type { FoodDay } from '@/types/domain'
import { cx } from '@/lib/cx'

export function FoodPage() {
  const trip = useActiveTrip()
  const addFoodDay = useTripStore((s) => s.addFoodDay)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [label, setLabel] = useState('')

  if (!trip) return null
  const selected = trip.foodDays.find((d) => d.id === selectedId) ?? null
  if (selected) return <FoodDayView day={selected} onBack={() => setSelectedId(null)} />

  const create = () => {
    const id = addFoodDay(date, label.trim() || 'Meal')
    setAdding(false)
    setLabel('')
    setSelectedId(id)
  }

  return (
    <div className="space-y-5 pt-2">
      <PageHeader
        title="Food Orders"
        subtitle="Take orders, tally for the vendor"
        icon={UtensilsCrossed}
        action={<IconButton icon={Plus} label="New meal" onClick={() => { setDate(todayISO()); setAdding(true) }} className="glass-soft" />}
      />

      {trip.foodDays.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No meals yet" body="Start a meal, add the menu, then pass the phone around." action={<Button icon={Plus} onClick={() => setAdding(true)}>New meal</Button>} />
      ) : (
        <div className="space-y-2.5">
          {[...trip.foodDays].reverse().map((d) => {
            const ordered = d.orders.length
            return (
              <button key={d.id} onClick={() => setSelectedId(d.id)} className="glass flex w-full items-center gap-3.5 rounded-2xl p-4 text-left active:scale-[0.99]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl glass-soft text-glacier-400"><UtensilsCrossed size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] leading-tight">{d.label}</p>
                  <p className="text-xs text-ice-300/55">{prettyShort(d.date)} · {d.menu.length} items · {ordered} ordered</p>
                </div>
                <span className="num-chip rounded-full bg-white/5 px-2.5 py-1 text-sm text-ice-200">{ordered}</span>
              </button>
            )
          })}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="New meal" footer={<Button full icon={Plus} onClick={create}>Create meal</Button>}>
        <div className="space-y-4 pt-1">
          <Field label="What meal"><Input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Lunch — Puerto Natales" onKeyDown={(e) => e.key === 'Enter' && create()} /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
      </Sheet>
    </div>
  )
}

/* ---------------- single meal ---------------- */

function FoodDayView({ day, onBack }: { day: FoodDay; onBack: () => void }) {
  const trip = useActiveTrip()!
  const addMenuItem = useTripStore((s) => s.addMenuItem)
  const removeMenuItem = useTripStore((s) => s.removeMenuItem)
  const setOrder = useTripStore((s) => s.setOrder)
  const removeFoodDay = useTripStore((s) => s.removeFoodDay)

  const [view, setView] = useState<'order' | 'meal'>('order')
  const [newItem, setNewItem] = useState('')
  const [vendorOpen, setVendorOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const orderByPerson = useMemo(() => new Map(day.orders.map((o) => [o.personId, o.itemId])), [day.orders])
  const tally = useMemo(() => {
    const m = new Map<string, number>()
    for (const o of day.orders) m.set(o.itemId, (m.get(o.itemId) ?? 0) + 1)
    return m
  }, [day.orders])

  const add = () => {
    if (newItem.trim()) addMenuItem(day.id, newItem.trim())
    setNewItem('')
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-2 pt-1">
        <IconButton icon={ChevronLeft} label="Back" onClick={onBack} className="-ml-2" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl leading-tight">{day.label}</h1>
          <p className="flex items-center gap-1.5 text-sm text-ice-300/60"><CalendarDays size={13} /> {prettyShort(day.date)}</p>
        </div>
        <IconButton icon={Trash2} label="Delete meal" tone="danger" onClick={() => setConfirmDelete(true)} />
      </div>

      {/* menu editor */}
      <Card className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-ice-300/60">Menu</p>
        {day.menu.length > 0 && (
          <div className="space-y-2">
            {day.menu.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="num-chip grid h-8 w-8 shrink-0 place-items-center rounded-lg btn-glacier text-sm">{item.number}</span>
                <span className="flex-1">{item.name}</span>
                <span className="num-chip text-sm text-ice-300/60">{tally.get(item.id) ?? 0}</span>
                <button onClick={() => removeMenuItem(day.id, item.id)} className="text-status-bad/60 hover:text-status-bad"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a menu item" onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button icon={Plus} onClick={add} aria-label="Add item" />
        </div>
      </Card>

      {day.menu.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Segmented options={[{ value: 'order', label: 'Take orders' }, { value: 'meal', label: 'By meal' }]} value={view} onChange={setView} />
            </div>
            <Button variant="soft" icon={Store} onClick={() => setVendorOpen(true)}>Vendor</Button>
          </div>

          {view === 'order' ? (
            <div className="space-y-2">
              <p className="px-1 text-xs text-ice-300/55">{day.orders.length} of {trip.people.length} ordered · pass the phone, each taps their meal number</p>
              {trip.people.map((p) => {
                const picked = orderByPerson.get(p.id)
                return (
                  <div key={p.id} className="glass rounded-2xl p-3">
                    <div className="mb-2 flex items-center gap-2.5">
                      <Avatar name={p.name} role={p.role} size={32} />
                      <span className="flex-1 text-[15px] font-medium">{p.name}</span>
                      {picked && <span className="num-chip rounded-full bg-glacier-500/20 px-2 py-0.5 text-xs text-glacier-400">#{day.menu.find((m) => m.id === picked)?.number}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {day.menu.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setOrder(day.id, p.id, picked === item.id ? null : item.id)}
                          className={cx('num-chip tap min-w-9 rounded-lg px-2.5 text-sm transition-all', picked === item.id ? 'btn-glacier' : 'glass-soft text-ice-200')}
                          aria-label={`${p.name} orders ${item.name}`}
                        >
                          {item.number}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {day.menu.map((item) => {
                const names = day.orders.filter((o) => o.itemId === item.id).map((o) => trip.people.find((p) => p.id === o.personId)).filter(Boolean)
                return (
                  <Card key={item.id} className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="num-chip grid h-7 w-7 place-items-center rounded-lg btn-glacier text-sm">{item.number}</span>
                      <span className="flex-1 font-display">{item.name}</span>
                      <span className="num-chip text-ice-300/60">{names.length}</span>
                    </div>
                    {names.length === 0 ? (
                      <p className="text-sm text-ice-300/40">No orders yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {names.map((p) => (
                          <span key={p!.id} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-1 pr-2.5 text-sm"><Avatar name={p!.name} size={20} />{p!.name}</span>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* vendor view — counts only, clean for screenshot */}
      <Sheet open={vendorOpen} onClose={() => setVendorOpen(false)} title="For the restaurant">
        <div className="space-y-4 pt-1">
          <div className="rounded-2xl border border-ice-300/15 bg-night-950/50 p-5">
            <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-glacier-400">{trip.name} · {prettyShort(day.date)}</p>
            <p className="mb-4 text-center font-display text-xl">{day.label}</p>
            <div className="space-y-2.5">
              {day.menu.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-ice-300/10 pb-2.5 last:border-0">
                  <span className="flex items-center gap-2.5"><span className="num-chip text-ice-300/50">{item.number}.</span><span className="text-[15px]">{item.name}</span></span>
                  <span className="num-chip text-xl">{tally.get(item.id) ?? 0}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-ice-300/20 pt-3">
              <span className="font-display">Total</span>
              <span className="num-chip text-xl text-glacier-400">{day.orders.length}</span>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-center text-xs text-ice-300/50"><ListChecks size={13} /> Counts only — no names. Screenshot this for the vendor.</p>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this meal?" footer={<div className="flex gap-2"><Button full variant="soft" onClick={() => setConfirmDelete(false)}>Keep</Button><Button full variant="danger" icon={Trash2} onClick={() => { removeFoodDay(day.id); onBack() }}>Delete</Button></div>}>
        <p className="pt-1 text-[15px] text-ice-200">Removes {day.label} and all its orders. This can't be undone.</p>
      </Sheet>
    </div>
  )
}
