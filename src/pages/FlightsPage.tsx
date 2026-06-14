import { useMemo, useState } from 'react'
import { Plane, Search, Plus, X, ExternalLink, PlaneTakeoff } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { prettyShort } from '@/lib/dates'

/** Live status via Google's flight card — no API key, works for any airline. */
function trackUrl(code: string, date?: string): string {
  const q = `${code} flight status${date ? ` ${prettyShort(date)}` : ''}`
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

export function FlightsPage() {
  const trip = useActiveTrip()
  const addFlight = useTripStore((s) => s.addFlight)
  const removeFlight = useTripStore((s) => s.removeFlight)
  const [query, setQuery] = useState('')
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [date, setDate] = useState('')

  const people = useMemo(() => {
    if (!trip) return []
    const q = query.trim().toLowerCase()
    return trip.people.filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
  }, [trip, query])

  if (!trip) return null
  const flightsFor = (id: string) => trip.flights.filter((f) => f.personId === id)
  const withFlights = trip.people.filter((p) => flightsFor(p.id).length > 0).length

  const submit = (personId: string) => {
    if (code.trim()) addFlight(personId, code, date || undefined)
    setCode(''); setDate(''); setOpenFor(null)
  }

  return (
    <div className="space-y-4 pt-2">
      <PageHeader title="Flights" subtitle={`${withFlights} of ${trip.people.length} have a flight`} icon={Plane} />

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names" className="w-full rounded-xl border border-white/12 bg-white/[0.06] py-3 pl-10 pr-4 text-[16px] text-ice-50 placeholder:text-ice-300/45 outline-none focus:border-glacier-500" />
      </div>

      {people.length === 0 ? (
        <EmptyState icon={PlaneTakeoff} title="No one found" />
      ) : (
        <div className="space-y-2">
          {people.map((p) => {
            const flights = flightsFor(p.id)
            const adding = openFor === p.id
            return (
              <div key={p.id} className="glass rounded-2xl p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} role={p.role} size={36} />
                  <span className="flex-1 font-medium">{p.name}</span>
                  <button onClick={() => { setOpenFor(adding ? null : p.id); setCode(''); setDate('') }} className="grid h-8 w-8 place-items-center rounded-lg glass-soft text-glacier-500">
                    {adding ? <X size={16} /> : <Plus size={16} />}
                  </button>
                </div>

                {flights.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {flights.map((f) => (
                      <span key={f.id} className="flex items-center gap-1.5 rounded-full glass-soft py-1 pl-2.5 pr-1.5 text-sm">
                        <a href={trackUrl(f.code, f.date)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-medium text-glacier-600">
                          <Plane size={13} /> {f.code}
                          {f.date && <span className="font-normal text-ice-300/60">· {prettyShort(f.date)}</span>}
                          <ExternalLink size={12} className="text-ice-300/50" />
                        </a>
                        <button onClick={() => removeFlight(f.id)} className="grid h-5 w-5 place-items-center rounded-full text-ice-300/40 hover:text-status-bad"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}

                {adding && (
                  <div className="mt-3 flex items-end gap-2">
                    <label className="flex-1 space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-ice-300/60">Flight #</span>
                      <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. LA841" autoCapitalize="characters" className="w-full rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-[16px] uppercase text-ice-50 placeholder:text-ice-300/45 placeholder:normal-case outline-none focus:border-glacier-500" onKeyDown={(e) => e.key === 'Enter' && submit(p.id)} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-ice-300/60">Date</span>
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-white/12 bg-white/[0.06] px-2 py-2 text-[15px] text-ice-50 outline-none focus:border-glacier-500" />
                    </label>
                    <button onClick={() => submit(p.id)} className="tap grid w-11 shrink-0 place-items-center rounded-lg btn-glacier"><Plus size={18} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="px-1 pb-2 text-center text-xs text-ice-300/45">Tap a flight number to open its live status.</p>
    </div>
  )
}
