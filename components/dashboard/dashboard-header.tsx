'use client'

import { useTasas } from '@/components/providers/tasas-provider'
import { useAuth } from '@/components/providers/auth-provider'

/**
 * Header del Dashboard — client component que muestra las tasas en vivo
 * desde el TasasProvider y el saludo al usuario.
 */
export function DashboardHeader() {
  const { tasaUsd, tasaEur } = useTasas()
  const { user } = useAuth()

  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-1">
      {/* Saludo en desktop, título compacto en móvil */}
      <h2 className="text-lg md:text-2xl font-bold tracking-tight text-foreground">
        <span className="hidden md:inline">
          Hola, {user?.nombre ?? 'Invitado'} 👋
        </span>
        <span className="md:hidden">Panel de Control</span>
      </h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs md:text-sm text-muted-foreground">
        <span className="capitalize">{fechaHoy}</span>
        <span className="text-border hidden sm:inline">•</span>
        <div className="flex items-center gap-3">
          <span className="font-medium font-mono">
            <span className="text-primary-accent font-bold">$</span> {tasaUsd.toFixed(2)} Bs.
          </span>
          <span className="text-border">|</span>
          <span className="font-medium font-mono">
            <span className="text-amber-500 font-bold">€</span> {tasaEur.toFixed(2)} Bs.
          </span>
        </div>
      </div>
    </div>
  )
}
