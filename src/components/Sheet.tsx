import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'

/**
 * Mobile bottom sheet. Slides up from the bottom, dims the backdrop, locks
 * body scroll, dismisses on backdrop tap or the close affordance.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => void (document.body.style.overflow = prev)
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-abyss/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cx(
              'relative w-full max-w-md rounded-t-[1.75rem] glass border-b-0 pb-safe',
              'max-h-[92dvh] overflow-hidden flex flex-col',
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-ice-300/25" />
              <h3 className="pt-2 text-lg font-display">{title}</h3>
              <button
                aria-label="Close"
                onClick={onClose}
                className="tap -mr-2 grid aspect-square w-10 place-items-center rounded-xl text-ice-300/70 hover:bg-white/8"
              >
                <X size={20} />
              </button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && <div className="border-t hairline px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
