import { cx } from '@/lib/cx'

/**
 * Layered Patagonia ridge line — purely decorative atmosphere.
 * Sits at the bottom of headers / onboarding panels.
 */
export function Mountains({ className }: { className?: string }) {
  return (
    <svg
      className={cx('pointer-events-none w-full', className)}
      viewBox="0 0 1200 320"
      fill="none"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      {/* far range */}
      <path
        d="M0 250 L160 150 L300 220 L460 120 L640 230 L820 140 L980 235 L1120 170 L1200 215 L1200 320 L0 320 Z"
        fill="#163c68"
        opacity="0.55"
      />
      {/* mid range */}
      <path
        d="M0 290 L120 210 L260 275 L420 180 L560 270 L720 190 L900 285 L1060 215 L1200 280 L1200 320 L0 320 Z"
        fill="#1d4e85"
        opacity="0.7"
      />
      {/* near jagged ridge with snow caps */}
      <path
        d="M0 320 L90 250 L150 285 L250 215 L330 300 L470 235 L560 300 L700 245 L820 305 L960 250 L1080 300 L1200 255 L1200 320 Z"
        fill="#0f2747"
      />
      <path d="M250 215 L286 263 L250 274 L214 263 Z" fill="#e4eefb" opacity="0.9" />
      <path d="M700 245 L730 285 L700 293 L670 285 Z" fill="#e4eefb" opacity="0.85" />
      <path d="M470 235 L500 277 L470 286 L440 277 Z" fill="#c4dbf4" opacity="0.8" />
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
        <path d="M-20 320 C60 280 140 360 220 320 S380 280 460 330" />
      </g>
    </svg>
  )
}
