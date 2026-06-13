import { cx } from '@/lib/cx'

/**
 * Clean single-line white mountain outline — used along the bottom of the
 * auth / onboarding / launcher screens.
 */
export function Mountains({ className }: { className?: string }) {
  return (
    <svg
      className={cx('pointer-events-none w-full', className)}
      viewBox="0 0 1200 240"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <path
        d="M0 224 L150 150 L250 192 L430 92 L520 150 L700 60 L840 150 L960 104 L1120 176 L1200 140"
        stroke="#2563eb"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Faint topographic contour texture for card/section backgrounds. */
export function TopoLines({ className }: { className?: string }) {
  return (
    <svg
      className={cx('pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 400 400"
    >
      <g fill="none" stroke="#97c1ea" strokeWidth="1" opacity="0.08">
        <path d="M-20 120 C60 80 140 160 220 120 S380 80 460 130" />
        <path d="M-20 160 C60 120 140 200 220 160 S380 120 460 170" />
        <path d="M-20 200 C60 160 140 240 220 200 S380 160 460 210" />
        <path d="M-20 240 C60 200 140 280 220 240 S380 200 460 250" />
        <path d="M-20 280 C60 240 140 320 220 280 S380 240 460 290" />
      </g>
    </svg>
  )
}
