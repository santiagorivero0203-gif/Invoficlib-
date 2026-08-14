/**
 * lib/actions/gastos.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para la tabla `gastos`.
 *
 * Soporta filtros compuestos por tipo (fijo/variable) y
 * estado (pagado/por_pagar), usados por los Tabs de la
 * vista /gastos.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

// ── Tipos de conveniencia ────────────────────────────────
export type Gasto = Database['public']['Tables']['gastos']['Row']
export type GastoInsert = Database['public']['Tables']['gastos']['Insert']
export type GastoUpdate = Database['public']['Tables']['gastos']['Update']

export type FiltroTipo = Gasto['tipo'] | 'todos'
export type FiltroEstado = Gasto['estado'] | 'todos'

// ── GASTOS ───────────────────────────────────────────────

/**
 * Lista todos los gastos con filtros opcionales.
 * Ordenados por fecha descendente.
 *
 * @param tipo   - 'fijo' | 'variable' | 'todos' (default).
 * @param estado - 'pagado' | 'por_pagar' | 'todos' (default).
 */
export async function getGastos(
  tipo: FiltroTipo = 'todos',
  estado: FiltroEstado = 'todos'
) {
  const supabase = createClient()
  let query = supabase.from('gastos').select('*').order('fecha', { ascending: false })

  if (tipo !== 'todos') query = query.eq('tipo', tipo)
  if (estado !== 'todos') query = query.eq('estado', estado)

  return query
}

/**
 * Obtiene un resumen de métricas financieras de gastos:
 * - Total gastado (todos los estados)
 * - Total fijos
 * - Total variables
 * - Total por pagar
 *
 * Retorna los totales en USD.
 */
export async function getResumenGastos(): Promise<{
  data: {
    total: number
    fijos: number
    variables: number
    por_pagar: number
  } | null
  error: unknown
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gastos')
    .select('tipo, estado, monto_usd')

  if (error || !data) return { data: null, error }

  const resumen = data.reduce(
    (acc, g) => {
      acc.total += g.monto_usd
      if (g.tipo === 'fijo') acc.fijos += g.monto_usd
      if (g.tipo === 'variable') acc.variables += g.monto_usd
      if (g.estado === 'por_pagar') acc.por_pagar += g.monto_usd
      return acc
    },
    { total: 0, fijos: 0, variables: 0, por_pagar: 0 }
  )

  return { data: resumen, error: null }
}

/**
 * Crea un nuevo gasto.
 *
 * @param gasto - Datos del gasto a registrar.
 */
export async function crearGasto(gasto: Omit<GastoInsert, 'id'>) {
  const supabase = createClient()

  return supabase
    .from('gastos')
    .insert(gasto)
    .select()
    .single()
}

/**
 * Marca un gasto como pagado.
 *
 * @param id - UUID del gasto.
 */
export async function marcarGastoPagado(id: string) {
  const supabase = createClient()

  return supabase
    .from('gastos')
    .update({ estado: 'pagado' } satisfies GastoUpdate)
    .eq('id', id)
    .select()
    .single()
}

/**
 * Elimina permanentemente un gasto.
 * Solo usar si el gasto fue registrado por error.
 *
 * @param id - UUID del gasto.
 */
export async function eliminarGasto(id: string) {
  const supabase = createClient()

  return supabase
    .from('gastos')
    .delete()
    .eq('id', id)
}
