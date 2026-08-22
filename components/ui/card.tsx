import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Contenedor principal de tarjeta con estética limpia y moderna:
 * Bordes redondeados elegantes, fondo adaptativo al tema y sombras sutiles.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border bg-card text-card-foreground shadow-2xs transition-all duration-200',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

/** Encabezado estructural de la tarjeta con espaciado equilibrado. */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1 p-4 pb-3 md:p-5 md:pb-3.5', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

/** Título principal dentro del encabezado con jerarquía clara. */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-sm md:text-base font-bold tracking-tight text-foreground', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

/** Subtítulo / descripción con contraste óptimo. */
export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs text-muted-foreground leading-relaxed', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

/** Área de contenido principal con padding homogéneo. */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 pt-0 md:p-5 md:pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'
