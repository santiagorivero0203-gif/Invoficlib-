import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Variantes visuales del botón reutilizable del dashboard. */
export type ButtonVariant = 'default' | 'primary' | 'danger' | 'outline'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-muted/80 text-foreground border border-border hover:bg-muted transition-colors shadow-xs',
  primary:
    'bg-foreground text-background font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-xs',
  danger:
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors shadow-xs',
  outline:
    'bg-card text-foreground border border-border hover:bg-muted/50 transition-colors shadow-xs',
}

/**
 * Botón reutilizable con variantes alineadas al design system oscuro/claro premium.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium',
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40',
        'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
)

Button.displayName = 'Button'
