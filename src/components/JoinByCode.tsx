import { useState } from 'react'
import { Search, Users2, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { peekInvite, redeemInvite, type TripPeek } from '@/lib/invites'

/**
 * Enter a trip code → preview the trip → join it. More robust than a link:
 * works no matter how the code is shared (text, said out loud, etc.).
 */
export function JoinByCode({ onJoined }: { onJoined: (tripId: string) => void }) {
  const [code, setCode] = useState('')
  const [peek, setPeek] = useState<TripPeek | null>(null)
  const [status, setStatus] = useState<'idle' | 'searching' | 'notfound' | 'joining'>('idle')

  const find = async () => {
    if (code.trim().length < 4) return
    setStatus('searching')
    setPeek(null)
    const result = await peekInvite(code)
    if (result) { setPeek(result); setStatus('idle') }
    else setStatus('notfound')
  }
  const join = async () => {
    setStatus('joining')
    const tripId = await redeemInvite(code)
    if (tripId) onJoined(tripId)
    else setStatus('notfound')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/\s/g, '')); setStatus('idle'); setPeek(null) }}
            placeholder="Trip code"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[17px] font-display tracking-widest text-ice-50 placeholder:text-[15px] placeholder:font-sans placeholder:tracking-normal placeholder:text-ice-300/45 outline-none focus:border-glacier-500"
            onKeyDown={(e) => e.key === 'Enter' && find()}
          />
        </div>
        <Button icon={status === 'searching' ? undefined : ArrowRight} onClick={find} disabled={code.trim().length < 4 || status === 'searching'} aria-label="Find trip">
          {status === 'searching' ? '…' : 'Find'}
        </Button>
      </div>

      {status === 'notfound' && (
        <p className="flex items-center gap-1.5 px-1 text-sm text-status-bad"><AlertCircle size={14} /> No trip found for that code. Double-check it with your co-leader.</p>
      )}

      {peek && (
        <div className="space-y-3 rounded-2xl border border-glacier-500/30 bg-glacier-500/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-glacier-500/15 text-glacier-500"><Users2 size={20} /></span>
            <div>
              <p className="font-display text-[15px] leading-tight">{peek.name}</p>
              <p className="text-xs text-ice-300/60">{peek.people} {peek.people === 1 ? 'person' : 'people'} on this trip</p>
            </div>
          </div>
          <Button full icon={status === 'joining' ? undefined : Users2} onClick={join} disabled={status === 'joining'}>
            {status === 'joining' ? 'Joining…' : 'Join this trip'}
          </Button>
        </div>
      )}
    </div>
  )
}
