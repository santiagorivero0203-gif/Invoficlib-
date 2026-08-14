import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Variantes semánticas para estados de inventario, notas y gastos. */
export type BadgeVariant =
  | 'entrada'
  | 'salida'
  | 'bajo'
  | 'neutral'
  | 'pagada'
  | 'parcial'
  | 'anulada'
  | 'pagado'
  | 'por_pagar'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  entrada: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  salida: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  bajo: 'bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/20',
  neutral: 'bg-muted/80 text-muted-foreground border-border',
  pagada: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  parcial: 'bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/20',
  anulada: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  pagado: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  por_pagar: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
}
/**
 * Insignia redonda para indicar estados de movimientos o niveles de stock.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
)

Badge.displayName = 'Badge'
