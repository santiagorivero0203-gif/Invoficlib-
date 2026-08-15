/**
 * lib/actions/tasa.ts
 * -------------------------------------------------------
 * Capa de acceso a datos para la tabla `tasas_cambio`.
 *
 * Permite consultar y registrar la tasa USD/VES del día.
 * El módulo /vender usa la tasa vigente para convertir
 * precios en tiempo real.
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

export type TasaCambio = Database['public']['Tables']['tasas_cambio']['Row']

/**
 * Obtiene la tasa de cambio más reciente registrada para una moneda específica.
 * Devuelve `null` si aún no hay ninguna tasa cargada.
 */
export async function getTasaVigente(moneda: 'USD' | 'EUR' = 'USD') {
  const supabase = createClient()

  return supabase
    .from('tasas_cambio')
    .select('*')
    .eq('moneda', moneda)
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle()
}

/**
 * Registra una nueva tasa de cambio.
 *
 * @param tasa - Monto en Bs. equivalente a 1 USD o 1 EUR.
 * @param moneda - 'USD' o 'EUR'.
 */
export async function registrarTasa(tasa: number, moneda: 'USD' | 'EUR' = 'USD') {
  const supabase = createClient()

  return supabase
    .from('tasas_cambio')
    .insert({ tasa, moneda })
    .select()
    .single()
}
