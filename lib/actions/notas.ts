/**
 * lib/actions/notas.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para las tablas `notas`,
 * `detalles_nota` y `devoluciones`.
 *
 * Fase 3: Soporta los 3 tipos de salida (venta, promoción,
 * consignación) y las RPCs de liquidación y corte.
 *
 * Cada función retorna `{ data, error }` siguiendo la
 * convención de Supabase para manejo uniforme de errores.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database, TipoSalida, Json } from '@/types/database.types'

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

/** Resultado de la RPC liquidar_promocion */
export interface LiquidarResult {
  ok: boolean
  error?: string
  correlativo?: string
  monto_liquidado?: number
}

/** Resultado de la RPC procesar_corte_consignacion */
export interface CorteResult {
  ok: boolean
  error?: string
  correlativo?: string
  total_vendido_usd?: number
  total_devuelto_uds?: number
}

/** Item del corte de consignación (enviado al RPC) */
export interface ItemCorte {
  detalle_nota_id: string
  producto_id: string
  vendidos: number
  devueltos: number
}

// ── NOTAS ────────────────────────────────────────────────

/**
 * Lista todas las notas ordenadas por fecha descendente.
 * Se incluyen las devoluciones para evitar N+1 en la tabla.
 *
 * @param filtroTipoSalida - Filtra por tipo de salida. Si omitido, retorna todas.
 * @param soloAbiertas     - Si true, solo retorna notas con estado_flotante = 'abierta'.
 */
export async function getNotas(
  filtroTipoSalida?: TipoSalida,
  soloAbiertas?: boolean
) {
  const supabase = createClient()

  let query = supabase
    .from('notas')
    .select('*, devoluciones(*)')
    .order('fecha_creacion', { ascending: false })

  if (filtroTipoSalida) {
    query = query.eq('tipo_salida', filtroTipoSalida)
  }

  if (soloAbiertas) {
    query = query.eq('estado_flotante', 'abierta')
  }

  return query
}

/**
 * Lista solo las notas flotantes (promociones y consignaciones abiertas).
 * Usa la vista `notas_flotantes_abiertas` para un query optimizado.
 */
export async function getNotasFlotantes() {
  const supabase = createClient()

  return supabase
    .from('notas')
    .select('*, devoluciones(*)')
    .in('tipo_salida', ['promocion', 'consignacion'])
    .eq('estado_flotante', 'abierta')
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
 * Crea una nueva nota junto con sus líneas de detalle.
 *
 * El trigger `trg_descontar_inventario_por_venta` se encarga
 * de generar los movimientos de salida en el Ledger.
 *
 * Fase 3: Ahora acepta tipo_salida y estado_flotante.
 * - tipo_salida='venta': estado_flotante='cerrada' (default)
 * - tipo_salida='promocion': estado_flotante='abierta'
 * - tipo_salida='consignacion': estado_flotante='abierta'
 *
 * @param nota     - Campos de la cabecera (cliente, tipo salida, totales).
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
 * El trigger `trg_procesar_devolucion_dinamica` se encarga de:
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

// ── OPERACIONES FLOTANTES (Fase 3) ──────────────────────

/**
 * Liquida una nota de tipo 'promocion' que está abierta.
 * Convierte los libros no devueltos en una venta real.
 *
 * Llama a la RPC `liquidar_promocion(p_nota_id)` en Supabase.
 *
 * @param notaId - UUID de la nota de promoción a liquidar.
 */
export async function liquidarPromocion(notaId: string): Promise<{
  data: LiquidarResult | null
  error: unknown
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('liquidar_promocion', { p_nota_id: notaId })

  return { data: data as LiquidarResult | null, error }
}

/**
 * Procesa el corte semanal de una consignación.
 * Recibe un array de items con cantidades vendidas y devueltas.
 *
 * Llama a la RPC `procesar_corte_consignacion(p_nota_id, p_items)`.
 *
 * @param notaId - UUID de la nota de consignación.
 * @param items  - Array de items con vendidos/devueltos por detalle.
 */
export async function procesarCorteConsignacion(
  notaId: string,
  items: ItemCorte[]
): Promise<{
  data: CorteResult | null
  error: unknown
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('procesar_corte_consignacion', {
      p_nota_id: notaId,
      p_items: items as unknown as Json,
    })

  return { data: data as CorteResult | null, error }
}

/**
 * Elimina (anula) una nota. Solo permitido para admin por RLS.
 *
 * @param notaId - UUID de la nota a eliminar.
 */
export async function eliminarNota(notaId: string) {
  const supabase = createClient()

  return supabase
    .from('notas')
    .delete()
    .eq('id', notaId)
}
