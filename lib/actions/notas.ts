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
): Promise<{ data: (Nota & { devoluciones: Devolucion[] })[] | null; error: unknown }> {
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

  const { data, error } = await query
  return {
    data: data as (Nota & { devoluciones: Devolucion[] })[] | null,
    error,
  }
}

/**
 * Lista solo las notas flotantes (promociones y consignaciones abiertas).
 * Usa la vista `notas_flotantes_abiertas` para un query optimizado.
 */
export async function getNotasFlotantes(): Promise<{
  data: (Nota & { devoluciones: Devolucion[] })[] | null
  error: unknown
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notas')
    .select('*, devoluciones(*)')
    .in('tipo_salida', ['promocion', 'consignacion'])
    .eq('estado_flotante', 'abierta')
    .order('fecha_creacion', { ascending: false })

  return {
    data: data as (Nota & { devoluciones: Devolucion[] })[] | null,
    error,
  }
}

/**
 * Obtiene una nota específica con todos sus detalles de
 * producto y sus devoluciones registradas.
 *
 * @param notaId - UUID de la nota.
 */
export async function getNotaCompleta(notaId: string): Promise<{
  data: NotaCompleta | null
  error: unknown
}> {
  const supabase = createClient()

  const { data, error } = await supabase
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

  return {
    data: data as unknown as NotaCompleta | null,
    error,
  }
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

  // Capturar usuario autenticado si no viene explícito
  let usuarioId = nota.usuario_id
  if (!usuarioId) {
    const { data: { user } } = await supabase.auth.getUser()
    usuarioId = user?.id || null
  }

  // 1. Insertar la cabecera con el usuario_id real
  const { data: notaCreada, error: errorNota } = await supabase
    .from('notas')
    .insert({
      ...nota,
      usuario_id: usuarioId,
    })
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
 * Concluye / Cierra una promoción de muestras escolares.
 * Los libros que la docente/colegio conservó quedan registrados como muestras
 * obsequiadas (cortesía promocional), cerrando el registro sin generar deuda ni cobro.
 *
 * @param notaId - UUID de la nota de promoción a cerrar.
 */
export async function cerrarPromocion(notaId: string) {
  const supabase = createClient()

  return supabase
    .from('notas')
    .update({ estado_flotante: 'cerrada' })
    .eq('id', notaId)
    .select()
    .single()
}

/**
 * Liquida una nota de tipo 'promocion' que está abierta.
 * (Mantenida por compatibilidad de esquemas anteriores).
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
 * Anula una nota por completo y revierte todo el stock asociado al Ledger.
 * Solo debe ser invocado por usuarios con rol Administrador (Jefe).
 *
 * Para cada ítem no devuelto de la nota, registra una devolución
 * que dispara `trg_procesar_devolucion_dinamica`, reingresando los libros
 * al `movimientos_inventario` como entradas y dejando la nota con total_usd = 0 y estado = 'anulada'.
 *
 * @param notaId    - UUID de la nota a anular.
 * @param motivo    - Razón de la anulación (opcional).
 * @param usuarioId - UUID del usuario que ejecuta la anulación.
 */
export async function anularNotaCompleta(
  notaId: string,
  motivo?: string,
  usuarioId?: string
): Promise<{ data: boolean | null; error: unknown }> {
  const supabase = createClient()

  // 1. Obtener la nota con sus líneas y devoluciones previas
  const { data: nota, error: errorNota } = await getNotaCompleta(notaId)
  if (errorNota || !nota) {
    return { data: null, error: errorNota ?? new Error('Nota no encontrada') }
  }

  if (nota.estado === 'anulada') {
    return { data: true, error: null }
  }

  const razonAnulacion = motivo?.trim() || `Anulación total de la nota ${nota.correlativo}`

  // 2. Revertir cada detalle pendiente
  for (const detalle of nota.detalles_nota) {
    const devueltos = (nota.devoluciones ?? []).reduce((acc: number, d: Devolucion) => {
      if (d.detalle_nota_id === detalle.id) return acc + d.cantidad_devuelta
      if (d.detalle_nota_id === null && d.producto_id === detalle.producto_id) {
        return acc + d.cantidad_devuelta
      }
      return acc
    }, 0)

    const pendiente = detalle.cantidad - devueltos

    if (pendiente > 0) {
      const { error: errDev } = await supabase.from('devoluciones').insert({
        nota_id: nota.id,
        producto_id: detalle.producto_id,
        detalle_nota_id: detalle.id,
        cantidad_devuelta: pendiente,
        monto_descontado: pendiente * detalle.precio_unitario_usd,
        motivo: razonAnulacion,
        usuario_id: usuarioId ?? null,
        fecha: new Date().toISOString(),
      })

      if (errDev) {
        return { data: null, error: errDev }
      }
    }
  }

  // 3. Asegurar estado final anulado y saldo en 0
  const { error: errorUpdate } = await supabase
    .from('notas')
    .update({
      estado: 'anulada',
      total_usd: 0,
      estado_flotante: 'cerrada',
      observaciones: nota.observaciones
        ? `${nota.observaciones} | [ANULADA: ${razonAnulacion}]`
        : `[ANULADA: ${razonAnulacion}]`,
      fecha_actualizacion: new Date().toISOString(),
    })
    .eq('id', notaId)

  if (errorUpdate) {
    return { data: null, error: errorUpdate }
  }

  return { data: true, error: null }
}

/**
 * Elimina físicamente una nota de la base de datos (hard delete).
 * Se recomienda usar `anularNotaCompleta` para preservar auditoría contable.
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

/**
 * Actualiza el estado de múltiples notas en lote (Bulk Action).
 *
 * @param notaIds     - Array de UUIDs de notas a actualizar.
 * @param nuevoEstado - Nuevo estado ('pagada' | 'parcial' | 'anulada').
 */
export async function actualizarEstadoNotasEnLote(
  notaIds: string[],
  nuevoEstado: 'pagada' | 'parcial' | 'anulada'
): Promise<{ count: number; error: unknown }> {
  if (!notaIds || notaIds.length === 0) {
    return { count: 0, error: null }
  }

  const supabase = createClient()

  const { error, data } = await supabase
    .from('notas')
    .update({
      estado: nuevoEstado,
      fecha_actualizacion: new Date().toISOString(),
    })
    .in('id', notaIds)
    .select('id')

  return {
    count: data ? data.length : 0,
    error,
  }
}


