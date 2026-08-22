import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Contenedor principal de tarjeta — adaptativo:
 * Compacto en móvil (rounded-2xl, shadow-sm), más espacioso en desktop.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

/** Encabezado estructural — padding compacto en móvil, espacioso en desktop. */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 p-4 pb-2 md:p-5 md:pb-3', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

/** Título principal — adaptativo (text-sm en móvil, text-base en desktop). */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-sm md:text-base font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

/** Subtítulo / descripción de la tarjeta con contraste óptimo. */
export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

/** Área de contenido principal — padding compacto en móvil. */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 pt-0 md:p-5 md:pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'
