import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import type { LucideIcon } from 'lucide-react'

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'ghost' | 'soft' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: LucideIcon
  full?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'btn-glacier font-medium',
  ghost: 'text-ice-200 hover:bg-white/8 border border-transparent',
  soft: 'glass-soft text-ice-100 hover:border-ice-300/30',
  danger: 'bg-status-bad/15 text-status-bad border border-status-bad/30 hover:bg-status-bad/25',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', icon: Icon, full, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cx(
        'tap inline-flex items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-medium',
        'transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        buttonVariants[variant],
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={18} strokeWidth={2.2} />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

/* ---------------- Icon button ---------------- */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  tone?: 'default' | 'danger'
}

export function IconButton({ icon: Icon, label, tone = 'default', className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx(
        'tap grid aspect-square w-11 place-items-center rounded-xl transition-all active:scale-95',
        tone === 'danger' ? 'text-status-bad hover:bg-status-bad/15' : 'text-ice-200 hover:bg-white/8',
        className,
      )}
      {...props}
    >
      <Icon size={20} strokeWidth={2.1} />
    </button>
  )
}

/* ---------------- Card ---------------- */

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('glass rounded-2xl', onClick && 'cursor-pointer active:scale-[0.99] transition-transform', className)}
    >
      {children}
    </div>
  )
}

/* ---------------- Inputs ---------------- */

const fieldBase =
  'w-full rounded-xl bg-white/[0.06] border border-white/12 px-4 py-3 text-[16px] text-ice-50 ' +
  'placeholder:text-ice-300/45 outline-none transition focus:border-glacier-500 focus:ring-4 focus:ring-glacier-500/10'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cx(fieldBase, className)} {...props} />,
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cx(fieldBase, 'resize-none leading-relaxed', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-ice-300/70">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ice-300/50">{hint}</span>}
    </label>
  )
}

/* ---------------- Pill / badge ---------------- */

export function Pill({ children, className, icon: Icon }: { children: ReactNode; className?: string; icon?: LucideIcon }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        'border border-ice-300/15 bg-white/8 text-ice-200',
        className,
      )}
    >
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </span>
  )
}

/* ---------------- Section header ---------------- */

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <h2 className="text-lg">{title}</h2>
      {action}
    </div>
  )
}

/* ---------------- Empty state ---------------- */

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ice-300/15 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl glass-soft text-glacier-400">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <div className="space-y-1">
        <p className="font-display text-ice-100">{title}</p>
        {body && <p className="mx-auto max-w-[16rem] text-sm text-ice-300/60">{body}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl glass-soft p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cx(
            'tap flex-1 rounded-lg px-3 text-sm font-medium transition-all',
            value === opt.value ? 'btn-glacier' : 'text-ice-300/70 hover:text-ice-100',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
