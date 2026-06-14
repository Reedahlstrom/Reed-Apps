import { useMemo, useState } from 'react'
import { Mail, Search, Check } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { useActiveTrip, useTripStore } from '@/store/useTripStore'
import { cx } from '@/lib/cx'

export function LettersPage() {
  const trip = useActiveTrip()
  const toggleLetter = useTripStore((s) => s.toggleLetter)
  const [query, setQuery] = useState('')

  const people = useMemo(() => {
    if (!trip) return []
    const q = query.trim().toLowerCase()
    return trip.people.filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
  }, [trip, query])

  if (!trip) return null
  const have = new Set(trip.letters)

  return (
    <div className="space-y-4 pt-2">
      <PageHeader title="Letters" subtitle={`${have.size} of ${trip.people.length} received`} icon={Mail} />

      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div className="h-full bg-status-good transition-all" style={{ width: `${(have.size / Math.max(1, trip.people.length)) * 100}%` }} />
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[16px] text-ice-50 placeholder:text-ice-300/45 outline-none focus:border-glacier-500" />
      </div>

      {people.length === 0 ? (
        <EmptyState icon={Mail} title="No one found" />
      ) : (
        <div className="space-y-2">
          {people.map((p) => {
            const got = have.has(p.id)
            return (
              <button key={p.id} onClick={() => toggleLetter(p.id)} className={cx('flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all', got ? 'border border-status-good/40 bg-status-good/8' : 'glass')}>
                <Avatar name={p.name} role={p.role} size={36} />
                <span className={cx('flex-1 font-medium', got && 'text-ice-300/70')}>{p.name}</span>
                <span className={cx('grid h-7 w-7 place-items-center rounded-full border transition-all', got ? 'border-status-good bg-status-good/20 text-status-good' : 'border-ice-300/30 text-transparent')}>
                  <Check size={15} />
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="px-1 pb-2 text-center text-xs text-ice-300/45">Tap a name once you've got their letter.</p>
    </div>
  )
}
