import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Contenedor principal de tarjeta con estilo premium glassmorphic. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[20px] border border-border bg-card text-card-foreground shadow-[0_10px_40px_-10px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300 hover:shadow-[0_15px_50px_-10px_rgba(0,0,0,0.07)]',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

/** Encabezado estructural de la tarjeta. */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5 p-6 pb-4', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

/** Título principal dentro del encabezado de la tarjeta. */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-bold tracking-tight text-foreground', className)}
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
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'

/** Área de contenido principal de la tarjeta. */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'
