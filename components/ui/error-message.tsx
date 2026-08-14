import { AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  /** Texto del error a mostrar al usuario. */
  message: string
  /** Severidad visual: 'error' (rojo) o 'warning' (amarillo). Default: 'error'. */
  severity?: 'error' | 'warning'
}

/**
 * Mensaje de error inline para sustituir datos cuando Supabase falla
 * o cuando hay un problema de validación.
 *
 * Admite dos variantes semánticas:
 *  - 'error': fondo rojo suave con ícono de X circular.
 *  - 'warning': fondo ámbar suave con ícono de triángulo.
 */
export function ErrorMessage({ message, severity = 'error' }: ErrorMessageProps) {
  const isError = severity === 'error'

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-[12px] border p-4 text-sm',
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-amber-300/60 bg-amber-50 text-amber-800'
      )}
    >
      {isError ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <strong>{isError ? 'Error al cargar los datos:' : 'Aviso:'}</strong>{' '}
        {message}
      </div>
    </div>
  )
}
