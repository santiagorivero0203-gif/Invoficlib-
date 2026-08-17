/**
 * lib/actions/movimientos.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para la tabla `movimientos_inventario`.
 * Ledger inmutable de entradas y salidas de stock.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type MovimientoInventario = Database['public']['Tables']['movimientos_inventario']['Row']
export type MovimientoInsert = Database['public']['Tables']['movimientos_inventario']['Insert']

export type MovimientoConProducto = MovimientoInventario & {
  productos: {
    nombre: string
    codigo_sku: string
    precio_usd: number
  } | null
  notas?: {
    correlativo: string
    cliente_nombre: string
    tipo_salida: string
  } | null
}

/**
 * Obtiene el historial de movimientos de inventario ordenado cronológicamente (más recientes primero).
 * Opcionalmente filtra por tipo ('entrada' | 'salida').
 */
export async function getMovimientos(tipo?: 'entrada' | 'salida') {
  const supabase = createClient()

  let query = supabase
    .from('movimientos_inventario')
    .select(`
      *,
      productos (
        nombre,
        codigo_sku,
        precio_usd
      ),
      notas (
        correlativo,
        cliente_nombre,
        tipo_salida
      )
    `)
    .order('fecha_creacion', { ascending: false })

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  return query
}

/**
 * Registra un movimiento manual de inventario (ej: ingreso de imprenta, compra de lote, ajuste por conteo, merma).
 */
export async function registrarMovimientoManual(
  movimiento: Omit<MovimientoInsert, 'id' | 'fecha_creacion'>
) {
  const supabase = createClient()

  return supabase
    .from('movimientos_inventario')
    .insert(movimiento)
    .select()
    .single()
}

/**
 * Elimina físicamente un movimiento de inventario.
 * Habilitado para la fase de pruebas y ajuste de datos.
 *
 * @param id - UUID del movimiento a eliminar.
 */
export async function eliminarMovimiento(id: string) {
  const supabase = createClient()

  return supabase
    .from('movimientos_inventario')
    .delete()
    .eq('id', id)
}

/**
 * Elimina todos los movimientos de un producto específico (solo para pruebas).
 *
 * @param productoId - UUID del producto.
 */
export async function limpiarMovimientosDeProducto(productoId: string) {
  const supabase = createClient()

  return supabase
    .from('movimientos_inventario')
    .delete()
    .eq('producto_id', productoId)
}
