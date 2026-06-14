import { cx } from '@/lib/cx'

const RIDGE =
  'M0 252 L70 214 L104 244 L150 168 L196 226 L250 150 L292 200 L350 112 L398 168 L470 44 ' +
  'L516 140 L558 96 L602 156 L660 84 L706 150 L780 132 L838 96 L900 166 L968 128 L1052 186 L1130 150 L1200 196'

/**
 * Fitz Roy range silhouette (à la the Patagonia mark): jagged needle peaks,
 * with an optional white ridge outline for use over the sunset gradient.
 */
export function FitzRoy({
  className,
  fill = '#171109',
  outline = false,
}: {
  className?: string
  fill?: string
  outline?: boolean
}) {
  return (
    <svg
      className={cx('pointer-events-none w-full', className)}
      viewBox="0 0 1200 320"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <path d={`M0 320 L0 252 ${RIDGE.slice(1)} L1200 320 Z`} fill={fill} />
      {outline && (
        <path d={RIDGE} stroke="#fffdf8" strokeOpacity="0.92" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </svg>
  )
}

/** Bottom-of-page decoration on the warm paper background. */
export function Mountains({ className }: { className?: string }) {
  return <FitzRoy className={className} fill="#2a2560" />
}

/** Sunset hero band with the black peaks rising into it (the iconic composition). */
export function SunsetHero({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cx('sunset relative overflow-hidden', className)}>
      {children}
      <FitzRoy className="absolute inset-x-0 bottom-0 h-1/2" fill="#120d07" outline />
    </div>
  )
}
