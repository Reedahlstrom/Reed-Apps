import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/* The Fitz Roy massif: low foothills, a dominant central needle, then the
   signature stepped descending needles to the right. */
const RIDGE =
  'M0 244 L96 214 L150 232 L214 178 L256 210 L312 150 L356 192 L408 120 ' +
  'L452 170 L516 60 L560 150 L606 188 L660 96 L706 166 L760 140 L820 178 ' +
  'L884 150 L956 192 L1036 168 L1120 200 L1200 182'

export function FitzRoy({
  className,
  fill = '#16100a',
  outline = false,
}: {
  className?: string
  fill?: string
  outline?: boolean
}) {
  return (
    <svg
      className={cx('pointer-events-none block w-full', className)}
      viewBox="0 0 1200 280"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={`M0 280 ${RIDGE.slice(1)} L1200 280 Z`} fill={fill} />
      {outline && (
        <path
          d={RIDGE}
          stroke="#fffaf0"
          strokeOpacity="0.95"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

/** Bottom-of-page decoration on the dark graphite background. */
export function Mountains({ className }: { className?: string }) {
  return <FitzRoy className={className} fill="#1c2230" />
}

/** Sunset hero band with the black peaks rising into it (the iconic composition). */
export function SunsetHero({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cx('sunset relative overflow-hidden', className)}>
      {children}
      <FitzRoy className="absolute inset-x-0 bottom-0 h-24" fill="#100b06" outline />
    </div>
  )
}
