/**
 * app/nota/[id]/page.tsx
 * -------------------------------------------------------
 * Página pública de verificación de notas.
 * Accesible sin autenticación — ideal para escaneos QR.
 * Si el usuario está autenticado en el sistema, muestra
 * opciones adicionales de gestión.
 * -------------------------------------------------------
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotaView from './nota-view'

interface NotaPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: NotaPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: nota } = await supabase
    .from('notas')
    .select('correlativo, cliente_nombre, estado')
    .eq('id', id)
    .single()

  if (!nota) {
    return { title: 'Nota no encontrada | Invoficlib' }
  }

  return {
    title: `Nota ${nota.correlativo} — ${nota.cliente_nombre} | Invoficlib`,
    description: `Comprobante de nota ${nota.correlativo} para ${nota.cliente_nombre}. Estado: ${nota.estado}.`,
    robots: 'noindex',
  }
}

export default async function NotaPage({ params }: NotaPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Leer la nota con todos sus detalles (sin autenticación requerida)
  const { data: nota, error } = await supabase
    .from('notas')
    .select(`
      *,
      detalles_nota (
        *,
        productos ( nombre, codigo_sku )
      ),
      devoluciones (*)
    `)
    .eq('id', id)
    .single()

  if (error || !nota) {
    notFound()
  }

  // Detectar sesión activa para mostrar controles de sistema
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthenticated = Boolean(session)

  return <NotaView nota={nota} isAuthenticated={isAuthenticated} />
}
