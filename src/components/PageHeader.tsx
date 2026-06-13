import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 pt-1">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-11 w-11 place-items-center rounded-2xl glass-soft text-glacier-400">
            <Icon size={22} strokeWidth={2} />
          </span>
        )}
        <div>
          <h1 className="text-2xl leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ice-300/60">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
