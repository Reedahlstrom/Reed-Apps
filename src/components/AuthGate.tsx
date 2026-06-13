import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mountain, Mail, Lock, ArrowRight, WifiOff } from 'lucide-react'
import { Mountains } from '@/components/Mountains'
import { Button, Input } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase'
import { getSession, onAuthChange, signIn, signUp } from '@/lib/auth'
import { redeemInvite } from '@/lib/invites'
import { SyncProvider } from '@/sync/SyncProvider'
import type { Session } from '@supabase/supabase-js'

const OFFLINE_KEY = 'reed-offline'

/**
 * Simple sign-in wall (email + password). Auto-logs-in returning users because
 * Supabase persists the session. An "offline" escape ensures the app is never
 * inaccessible. Active only when Supabase is configured.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(() => localStorage.getItem(OFFLINE_KEY) === '1')
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState(false)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoaded(true); return }
    getSession().then(setSession).finally(() => setLoaded(true))
    return onAuthChange(setSession)
  }, [])

  if (!isSupabaseConfigured || offline) return <>{children}</>
  if (!loaded) return <div className="alpine-backdrop grain min-h-dvh" />

  if (session) {
    return (
      <>
        <PendingInviteRedeemer />
        <SyncProvider active />
        {children}
      </>
    )
  }

  const submit = async () => {
    setError(null)
    setBusy(true)
    const res = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (!res.ok) setError(res.error ?? 'Something went wrong.')
  }

  const goOffline = () => { localStorage.setItem(OFFLINE_KEY, '1'); setOffline(true) }
  const hasPendingInvite = Boolean(localStorage.getItem('pending_invite'))

  return (
    <div className="alpine-backdrop grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-7">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-sm">
        <span className="grid h-14 w-14 place-items-center rounded-2xl glass text-glacier-400"><Mountain size={26} strokeWidth={1.9} /></span>

        <div className="mt-6">
          <h1 className="font-display text-3xl leading-tight">{mode === 'signin' ? 'Welcome back' : 'Create your login'}</h1>
          <p className="mt-1 text-[15px] text-ice-300/70">
            {hasPendingInvite ? "You've been invited to a trip — sign in to join it." : 'Trip leaders only. Pick a password you’ll remember.'}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" className="pl-10" />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ice-300/40" />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="pl-10" onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && password.length >= 6 && submit()} />
          </div>
          {error && <p className="text-sm text-status-bad">{error}</p>}
          <Button full disabled={!email.includes('@') || password.length < 6 || busy} onClick={submit}>
            {busy ? 'One sec…' : mode === 'signin' ? 'Sign in' : 'Create & enter'} <ArrowRight size={18} />
          </Button>
        </div>

        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }} className="mt-4 text-sm text-glacier-400">
          {mode === 'signin' ? 'New here? Create a login' : 'Have a login? Sign in'}
        </button>

        {!hasPendingInvite && (
          <button onClick={goOffline} className="mt-3 flex w-full items-center justify-center gap-2 py-1 text-sm text-ice-300/45"><WifiOff size={14} /> Use offline on this device</button>
        )}
      </motion.div>
      <Mountains className="absolute inset-x-0 bottom-0 h-44 opacity-50" />
    </div>
  )
}

/** After sign-in, if a join code is pending, redeem it and open the trip. */
function PendingInviteRedeemer() {
  const navigate = useNavigate()
  useEffect(() => {
    const code = localStorage.getItem('pending_invite')
    if (!code) return
    redeemInvite(code).then((tripId) => {
      localStorage.removeItem('pending_invite')
      if (tripId) navigate('/trip', { replace: true })
    })
  }, [navigate])
  return null
}
