import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Variantes visuales del botón con jerarquía estructurada. */
export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-muted text-foreground border border-border hover:bg-muted/80 active:scale-[0.98] transition-all shadow-xs',
  primary:
    'bg-foreground text-background font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-xs',
  secondary:
    'bg-muted/60 text-foreground border border-border/80 hover:bg-muted active:scale-[0.98] transition-all shadow-xs',
  outline:
    'bg-card text-foreground border border-border hover:bg-muted/40 active:scale-[0.98] transition-all shadow-xs',
  ghost:
    'bg-transparent text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all',
  danger:
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-[0.98] transition-all shadow-xs',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 py-2 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-xl',
}

/**
 * Botón con soporte de jerarquía visual estricta y micro-interacciones táctiles fluidas.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent/40',
        'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
)

Button.displayName = 'Button'
