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

/** Producto con su stock y valor total calculado en tiempo real. */
export type ProductoConStock = Producto & {
  stock: number
  valor_total_usd?: number
}

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
 * Retorna los productos activos junto con su stock actual y valorización,
 * consultando la vista `stock_actual` (o calculando vía ledger en fallback).
 */
export async function getProductosConStock(): Promise<{
  data: ProductoConStock[] | null
  error: unknown
}> {
  const supabase = createClient()

  // 1. Intentar consultar directamente la vista `stock_actual` en Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: viewData, error: viewError } = await (supabase as any)
    .from('stock_actual')
    .select('*')
    .order('nombre')

  if (!viewError && viewData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productos: ProductoConStock[] = (viewData as any[]).map((p) => {
      const stock = Math.max(0, Number(p.stock) || 0)
      const precio = Number(p.precio_usd) || 0
      return {
        id: p.id || p.producto_id,
        codigo_sku: p.codigo_sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precio_usd: precio,
        stock_minimo: p.stock_minimo,
        estado: p.estado,
        imagen_url: p.imagen_url,
        fecha_creacion: p.fecha_creacion,
        stock,
        valor_total_usd: Number(p.valor_total_usd) || (stock * precio),
      }
    })
    return { data: productos, error: null }
  }

  // 2. Fallback de agregación directa sobre el ledger de movimientos
  const { data: productos, error: errProductos } = await supabase
    .from('productos')
    .select('*')
    .eq('estado', true)
    .order('nombre')

  if (errProductos || !productos) {
    return { data: null, error: errProductos }
  }

  const { data: movimientos, error: errMov } = await supabase
    .from('movimientos_inventario')
    .select('producto_id, tipo, cantidad')

  if (errMov || !movimientos) {
    return { data: null, error: errMov }
  }

  const stockMap: Record<string, number> = {}
  for (const m of movimientos) {
    stockMap[m.producto_id] = (stockMap[m.producto_id] ?? 0) + (m.tipo === 'entrada' ? m.cantidad : -m.cantidad)
  }

  const productosConStock: ProductoConStock[] = productos.map((p) => {
    const stock = Math.max(0, stockMap[p.id] ?? 0)
    return {
      ...p,
      stock,
      valor_total_usd: stock * p.precio_usd,
    }
  })

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
 * Desactiva un producto cambiando `estado` a false (modo seguro).
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

/**
 * Elimina físicamente un producto de la base de datos (hard delete).
 * Habilitado para la fase de pruebas y limpieza de datos.
 *
 * @param id - UUID del producto.
 */
export async function eliminarProductoFisico(id: string) {
  const supabase = createClient()

  return supabase
    .from('productos')
    .delete()
    .eq('id', id)
}
