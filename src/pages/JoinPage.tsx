import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mountain, Loader2 } from 'lucide-react'
import { Mountains } from '@/components/Mountains'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * Landing for an invite link. AuthGate has already ensured the user is signed
 * in, and PendingInviteRedeemer does the actual redeem + redirect to /trip.
 * This is the brief "joining…" splash (and a fallback if sync is off).
 */
export function JoinPage() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="alpine-backdrop grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-8 text-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col items-center">
        <span className="grid h-16 w-16 place-items-center rounded-3xl glass text-glacier-400"><Mountain size={30} strokeWidth={1.8} /></span>
        <h1 className="mt-6 font-display text-3xl">Joining your trip</h1>
        {!isSupabaseConfigured ? (
          <p className="mt-2 max-w-xs text-[15px] text-ice-300/70">Invites need sync turned on. Ask the leader for help, or <Link to="/" className="text-glacier-400">go home</Link>.</p>
        ) : (
          <>
            <Loader2 className="mt-5 animate-spin text-glacier-400" />
            {slow && <Link to="/trip" className="mt-5 text-sm text-glacier-400">Taking a while — tap to continue</Link>}
          </>
        )}
      </motion.div>
      <Mountains className="absolute inset-x-0 bottom-0 h-44 opacity-50" />
    </div>
  )
}
