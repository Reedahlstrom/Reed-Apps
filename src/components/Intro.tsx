import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mountains } from '@/components/Mountains'

/**
 * Cinematic open: "Love God · Love people" → "This is real" → reveal.
 * Tap to skip. Plays once per onboarding entry.
 */
const PHRASES: { lines: string[]; hold: number }[] = [
  { lines: ['Love God', 'Love people'], hold: 2400 },
  { lines: ['This is real'], hold: 2000 },
]

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (i >= PHRASES.length) {
      const t = setTimeout(onDone, 200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setI((n) => n + 1), PHRASES[i].hold)
    return () => clearTimeout(t)
  }, [i, onDone])

  const current = PHRASES[i]

  return (
    <motion.div
      className="alpine-backdrop grain fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-8"
      onClick={onDone}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            {current.lines.map((line, li) => (
              <motion.h1
                key={li}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + li * 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-ice-50"
              >
                {line}
              </motion.h1>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* faint breathing glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-glacier-500/20 blur-3xl"
        animate={{ opacity: [0.25, 0.5, 0.25], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <Mountains className="absolute inset-x-0 bottom-0 h-44 opacity-50" />
      <p className="pb-safe absolute bottom-6 text-xs text-ice-300/40">tap to continue</p>
    </motion.div>
  )
}
