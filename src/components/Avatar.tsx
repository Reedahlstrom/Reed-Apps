import { cx } from '@/lib/cx'
import type { Role } from '@/types/domain'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic glacial hue per name so the same person keeps the same color. */
function hueFor(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  // bias toward blue/teal band (180–230)
  return 180 + (h % 60)
}

const roleRing: Record<Role, string> = {
  leader: 'ring-2 ring-sand-300/70',
  coleader: 'ring-2 ring-glacier-400/70',
  parent: 'ring-1 ring-ice-300/40',
  builder: 'ring-1 ring-slate-200',
}

export function Avatar({
  name,
  role,
  size = 40,
  className,
}: {
  name: string
  role?: Role
  size?: number
  className?: string
}) {
  const hue = hueFor(name)
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-full font-display font-medium text-white', role && roleRing[role], className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(150deg, hsl(${hue} 70% 58%), hsl(${hue + 20} 65% 38%))`,
      }}
    >
      {initials(name)}
    </span>
  )
}
