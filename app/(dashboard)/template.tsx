'use client'

/**
 * app/(dashboard)/template.tsx
 * -------------------------------------------------------
 * Plantilla de transición reactiva de Next.js App Router.
 *
 * A diferencia de layout.tsx, template.tsx se re-monta
 * en cada cambio de ruta, disparando:
 * 1. Barra de progreso superior luminosa (.page-progress-bar).
 * 2. Transición suave de entrada (.page-transition) que
 *    disimula los tiempos de carga y da sensación instantánea.
 * -------------------------------------------------------
 */

import { usePathname } from 'next/navigation'
import React from 'react'

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <>
      {/* Barra de progreso luminosa en la parte superior durante la navegación */}
      <div key={`progress-${pathname}`} className="page-progress-bar" />

      {/* Contenido con transición suave y elástica */}
      <div key={`page-${pathname}`} className="page-transition min-h-[calc(100vh-8rem)]">
        {children}
      </div>
    </>
  )
}
