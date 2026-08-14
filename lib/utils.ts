import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrae un mensaje legible a partir de un error de Supabase o genérico.
 * Orden de prioridad:
 *   1. null / undefined → fallback
 *   2. Objeto con propiedad `message` string (errores de Supabase)
 *   3. instanceof Error
 *   4. Fallback genérico
 */
export function errorMessage(error: unknown): string {
  if (error == null) return 'Error desconocido al comunicarse con Supabase'
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) return message
  }
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.length > 0) return error
  return 'Error desconocido al comunicarse con Supabase'
}
