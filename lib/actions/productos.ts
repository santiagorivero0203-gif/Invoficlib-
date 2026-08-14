/**
 * lib/actions/productos.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para la tabla `productos` y la
 * vista derivada de stock actual.
 *
 * El stock vigente se calcula sumando los movimientos de
 * inventario en `movimientos_inventario`. Si luego creás
 * una vista materializada `stock_actual` en Supabase,
 * podés reemplazar la función `getProductosConStock` por
 * un query directo a esa vista.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// ── Tipos de conveniencia ────────────────────────────────
export type Producto = Database['public']['Tables']['productos']['Row']
export type ProductoInsert = Database['public']['Tables']['productos']['Insert']
export type ProductoUpdate = Database['public']['Tables']['productos']['Update']

/** Producto con su stock calculado en tiempo real. */
export type ProductoConStock = Producto & { stock: number }

// ── PRODUCTOS ────────────────────────────────────────────

/**
 * Retorna todos los productos activos ordenados por nombre.
 * No incluye el stock (usar `getProductosConStock` si necesitás).
 */
export async function getProductos() {
  const supabase = createClient()

  return supabase
    .from('productos')
    .select('*')
    .eq('estado', true)
    .order('nombre')
}

/**
 * Retorna los productos activos junto con su stock actual,
 * calculado sumando y restando los movimientos de inventario.
 *
 * ⚠️ Este cálculo puede ser costoso con muchos movimientos.
 *    Considerar una view o función RPC en Supabase para escalar.
 */
export async function getProductosConStock(): Promise<{
  data: ProductoConStock[] | null
  error: unknown
}> {
  const supabase = createClient()

  // 1. Obtener productos activos
  const { data: productos, error: errProductos } = await supabase
    .from('productos')
    .select('*')
    .eq('estado', true)
    .order('nombre')

  if (errProductos || !productos) {
    return { data: null, error: errProductos }
  }

  // 2. Obtener todos los movimientos para calcular stock
  const { data: movimientos, error: errMov } = await supabase
    .from('movimientos_inventario')
    .select('producto_id, tipo, cantidad')

  if (errMov || !movimientos) {
    return { data: null, error: errMov }
  }

  // 3. Calcular stock por producto (entradas − salidas, mínimo 0)
  const stockMap: Record<string, number> = {}
  for (const m of movimientos) {
    stockMap[m.producto_id] = (stockMap[m.producto_id] ?? 0) + (m.tipo === 'entrada' ? m.cantidad : -m.cantidad)
  }

  const productosConStock: ProductoConStock[] = productos.map((p) => ({
    ...p,
    // Math.max(0, ...) previene que se muestre stock negativo en la UI
    // (puede ocurrir si hay salidas sin entrada previa en el ledger)
    stock: Math.max(0, stockMap[p.id] ?? 0),
  }))

  return { data: productosConStock, error: null }
}

/**
 * Obtiene un único producto por su id.
 *
 * @param id - UUID del producto.
 */
export async function getProducto(id: string) {
  const supabase = createClient()

  return supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single()
}

/**
 * Crea un nuevo producto en el catálogo.
 *
 * @param producto - Campos del producto a crear.
 */
export async function crearProducto(producto: Omit<ProductoInsert, 'id' | 'fecha_creacion'>) {
  const supabase = createClient()

  return supabase
    .from('productos')
    .insert(producto)
    .select()
    .single()
}

/**
 * Actualiza los campos de un producto existente.
 *
 * @param id    - UUID del producto.
 * @param datos - Campos a actualizar (parciales).
 */
export async function actualizarProducto(id: string, datos: ProductoUpdate) {
  const supabase = createClient()

  return supabase
    .from('productos')
    .update(datos)
    .eq('id', id)
    .select()
    .single()
}

/**
 * Desactiva (soft-delete) un producto cambiando `estado` a false.
 * No borra el registro para mantener el historial de movimientos.
 *
 * @param id - UUID del producto.
 */
export async function eliminarProducto(id: string) {
  const supabase = createClient()

  return supabase
    .from('productos')
    .update({ estado: false })
    .eq('id', id)
}
