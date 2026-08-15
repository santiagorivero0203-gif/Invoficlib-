/**
 * lib/actions/cuentas.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para el resumen financiero del
 * módulo /cuentas.
 *
 * Calcula el Ledger contable desde las tablas reales:
 *   - Ingresos  = SUM(notas.total_usd WHERE estado = 'pagada')
 *   - COGS      = SUM(detalles_nota.subtotal_usd) de las notas pagadas
 *                 (precio de costo no está en el esquema aún → se usa
 *                  el mismo subtotal como aproximación por ahora)
 *   - Gastos Op = SUM(gastos.monto_usd WHERE estado = 'pagado')
 *   - Utilidad  = Ingresos - COGS - Gastos Op
 *
 * ⚙️ Si el volumen de datos crece, considerar reemplazar por
 *    una función RPC `obtener_resumen_financiero()` en Supabase.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'

export interface ResumenFinanciero {
  ingresos_usd: number
  cogs_usd: number
  utilidad_bruta_usd: number
  gastos_op_usd: number
  utilidad_neta_usd: number
  margen_neto_pct: number
}

/**
 * Calcula el resumen financiero del período completo
 * (sin filtro de fechas por ahora).
 *
 * Retorna los montos en USD y los porcentajes para
 * alimentar las tarjetas Bento de /cuentas.
 */
export async function getResumenFinanciero(): Promise<{
  data: ResumenFinanciero | null
  error: unknown
}> {
  const supabase = createClient()

  // 1. Notas pagadas → Ingresos
  const { data: notas, error: errNotas } = await supabase
    .from('notas')
    .select('total_usd, subtotal_usd')
    .eq('estado', 'pagada')

  if (errNotas) return { data: null, error: errNotas }

  const ingresos_usd = (notas ?? []).reduce((s, n) => s + n.total_usd, 0)
  // Mientras no exista un campo `costo_unitario`, COGS ≈ subtotal de ventas
  // (se puede refinar con un campo de costo en `productos` en el futuro)
  const cogs_usd = (notas ?? []).reduce((s, n) => s + n.subtotal_usd, 0)

  // 2. Gastos operativos pagados
  const { data: gastos, error: errGastos } = await supabase
    .from('gastos')
    .select('monto_usd')
    .eq('estado', 'pagado')

  if (errGastos) return { data: null, error: errGastos }

  const gastos_op_usd = (gastos ?? []).reduce((s, g) => s + g.monto_usd, 0)

  // 3. Cálculo del Ledger
  const utilidad_bruta_usd = ingresos_usd - cogs_usd
  const utilidad_neta_usd = utilidad_bruta_usd - gastos_op_usd
  const margen_neto_pct =
    ingresos_usd > 0 ? (utilidad_neta_usd / ingresos_usd) * 100 : 0

  return {
    data: {
      ingresos_usd,
      cogs_usd,
      utilidad_bruta_usd,
      gastos_op_usd,
      utilidad_neta_usd,
      margen_neto_pct: parseFloat(margen_neto_pct.toFixed(1)),
    },
    error: null,
  }
}

/**
 * Obtiene la tasa de cambio más reciente (USD → VES).
 * La usa el módulo /vender y /cuentas para mostrar
 * equivalencias en bolívares.
 */
export async function getTasaVigente(): Promise<{
  data: number | null
  error: unknown
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasas_cambio')
    .select('tasa')
    .eq('moneda', 'USD')
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return { data: null, error }
  return { data: (data as any).tasa, error: null }
}
