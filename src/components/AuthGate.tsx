import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Mountain, Mail, ArrowRight, Check, WifiOff, LogOut } from 'lucide-react'
import { Mountains } from '@/components/Mountains'
import { Button, Input } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSession, onAuthChange, sendMagicLink, signOut, isEmailAllowed } from '@/lib/auth'
import { SyncProvider } from '@/sync/SyncProvider'
import type { Session } from '@supabase/supabase-js'

const OFFLINE_KEY = 'reed-offline'

type Phase = 'loading' | 'signed-out' | 'checking' | 'allowed' | 'denied'

/**
 * Sign-in wall, active only when Supabase is configured. There is always an
 * "use offline on this device" escape so the trip is never inaccessible.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(() => localStorage.getItem(OFFLINE_KEY) === '1')
  const [phase, setPhase] = useState<Phase>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    getSession().then(setSession).finally(() => {})
    return onAuthChange(setSession)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    if (!session) {
      setPhase('signed-out')
      return
    }
    setPhase('checking')
    isEmailAllowed().then((ok) => {
      if (!cancelled) setPhase(ok ? 'allowed' : 'denied')
    })
    return () => { cancelled = true }
  }, [session])

  // Not configured, or user chose offline → just run the app locally.
  if (!isSupabaseConfigured || offline) return <>{children}</>

  if (phase === 'allowed') {
    return (
      <>
        <SyncProvider active />
        {children}
      </>
    )
  }

  const goOffline = () => { localStorage.setItem(OFFLINE_KEY, '1'); setOffline(true) }

  const submit = async () => {
    setError(null)
    setBusy(true)
    const res = await sendMagicLink(email)
    setBusy(false)
    if (res.ok) setSent(true)
    else setError(res.error ?? 'Could not send the link.')
  }

  return (
    <div className="alpine-backdrop grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-7">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-sm">
        <span className="grid h-14 w-14 place-items-center rounded-2xl glass text-glacier-400"><Mountain size={26} strokeWidth={1.9} /></span>

        {phase === 'denied' ? (
          <DeniedView email={session?.user.email ?? ''} onOffline={goOffline} onSignOut={() => signOut()} />
        ) : sent ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-status-good"><Check size={18} /> <span className="font-display text-lg">Check your email</span></div>
            <p className="text-[15px] text-ice-300/70">We sent a sign-in link to <span className="text-ice-50">{email}</span>. Open it on this phone to come in.</p>
            <button onClick={() => setSent(false)} className="text-sm text-glacier-400">Use a different email</button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <h1 className="font-display text-3xl leading-tight">Trip Leader</h1>
              <p className="mt-1 text-[15px] text-ice-300/70">Sign in to sync with your co-leader.</p>
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" inputMode="email" autoCapitalize="none" className="pl-10" onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && submit()} />
            </div>
            {error && <p className="text-sm text-status-bad">{error}</p>}
            <Button full disabled={!email.includes('@') || busy} onClick={submit}>{busy ? 'Sending…' : 'Email me a link'} <ArrowRight size={18} /></Button>
            <button onClick={goOffline} className="flex w-full items-center justify-center gap-2 py-1 text-sm text-ice-300/50"><WifiOff size={14} /> Use offline on this device</button>
          </div>
        )}
      </motion.div>
      <Mountains className="absolute inset-x-0 bottom-0 h-44 opacity-50" />
    </div>
  )
}

function DeniedView({ email, onOffline, onSignOut }: { email: string; onOffline: () => void; onSignOut: () => void }) {
  return (
    <div className="mt-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl leading-tight">Not on the trip yet</h1>
        <p className="mt-1 text-[15px] text-ice-300/70"><span className="text-ice-50">{email}</span> isn't on the access list, or the database isn't set up yet. Ask the trip leader to add your email.</p>
      </div>
      <Button full variant="soft" icon={WifiOff} onClick={onOffline}>Use offline on this device</Button>
      <button onClick={onSignOut} className="flex w-full items-center justify-center gap-2 py-1 text-sm text-ice-300/50"><LogOut size={14} /> Sign out</button>
    </div>
  )
}
