/**
 * lib/actions/notas.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para las tablas `notas`,
 * `detalles_nota` y `devoluciones`.
 *
 * Todos los métodos utilizan el cliente de Supabase SSR
 * para el navegador (createClient de lib/supabase/client).
 *
 * Cada función retorna `{ data, error }` siguiendo la
 * convención de Supabase, para que las páginas manejen
 * los errores de manera uniforme.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// ── Tipos de conveniencia derivados del esquema ──────────
export type Nota = Database['public']['Tables']['notas']['Row']
export type NotaInsert = Database['public']['Tables']['notas']['Insert']
export type DetalleNota = Database['public']['Tables']['detalles_nota']['Row']
export type DetalleNotaInsert = Database['public']['Tables']['detalles_nota']['Insert']
export type Devolucion = Database['public']['Tables']['devoluciones']['Row']
export type DevolucionInsert = Database['public']['Tables']['devoluciones']['Insert']

/** Nota completa: incluye sus líneas de detalle y sus devoluciones. */
export type NotaCompleta = Nota & {
  detalles_nota: (DetalleNota & { productos: { nombre: string; codigo_sku: string } | null })[]
  devoluciones: Devolucion[]
}

// ── NOTAS ────────────────────────────────────────────────

/**
 * Lista todas las notas ordenadas por fecha descendente.
 * Se incluyen las devoluciones en el mismo query para
 * evitar N+1 al renderizar la tabla de pedidos.
 */
export async function getNotas() {
  const supabase = createClient()

  return supabase
    .from('notas')
    .select('*, devoluciones(*)')
    .order('fecha_creacion', { ascending: false })
}

/**
 * Obtiene una nota específica con todos sus detalles de
 * producto y sus devoluciones registradas.
 *
 * @param notaId - UUID de la nota.
 */
export async function getNotaCompleta(notaId: string) {
  const supabase = createClient()

  return supabase
    .from('notas')
    .select(`
      *,
      detalles_nota (
        *,
        productos ( nombre, codigo_sku )
      ),
      devoluciones (*)
    `)
    .eq('id', notaId)
    .single()
}

/**
 * Crea una nueva nota de venta junto con sus líneas de
 * detalle en una sola transacción lógica.
 *
 * El trigger `trg_descontar_inventario_por_venta` en
 * Supabase se encargará de descontar el stock al insertar
 * los detalles — no es necesario hacerlo aquí.
 *
 * @param nota     - Campos de la cabecera (cliente, totales, etc.).
 * @param detalles - Líneas de producto (sin `nota_id`; se añade aquí).
 */
export async function crearNota(
  nota: Omit<NotaInsert, 'id' | 'correlativo'>,
  detalles: Omit<DetalleNotaInsert, 'nota_id' | 'id'>[]
) {
  const supabase = createClient()

  // 1. Insertar la cabecera y recuperar el id generado.
  const { data: notaCreada, error: errorNota } = await supabase
    .from('notas')
    .insert(nota)
    .select()
    .single()

  if (errorNota || !notaCreada) {
    return { data: null, error: errorNota }
  }

  // 2. Insertar los detalles asociando el nota_id.
  const lineas: DetalleNotaInsert[] = detalles.map((d) => ({
    ...d,
    nota_id: notaCreada.id,
  }))

  const { error: errorDetalles } = await supabase
    .from('detalles_nota')
    .insert(lineas)

  if (errorDetalles) {
    return { data: null, error: errorDetalles }
  }

  return { data: notaCreada, error: null }
}

// ── DEVOLUCIONES ─────────────────────────────────────────

/**
 * Registra una devolución parcial o total sobre un detalle
 * de nota existente.
 *
 * El trigger `trg_procesar_devolucion_dinamica` en Supabase
 * se encargará de:
 *   1. Reingresar el stock al `movimientos_inventario`.
 *   2. Recalcular el `total_usd` de la nota padre.
 *   3. Cambiar el `estado` de la nota si total llega a 0.
 *
 * @param devolucion - Datos de la devolución a registrar.
 */
export async function crearDevolucion(devolucion: Omit<DevolucionInsert, 'id'>) {
  const supabase = createClient()

  return supabase
    .from('devoluciones')
    .insert(devolucion)
    .select()
    .single()
}
