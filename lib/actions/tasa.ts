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
 * Obtiene la tasa de cambio más reciente registrada.
 * Devuelve `null` si aún no hay ninguna tasa cargada.
 */
export async function getTasaVigente() {
  const supabase = createClient()

  return supabase
    .from('tasas_cambio')
    .select('*')
    .order('fecha_creacion', { ascending: false })
    .limit(1)
    .maybeSingle()
}

/**
 * Registra una nueva tasa de cambio para el día.
 *
 * @param tasa_ves - Monto en Bs. equivalente a 1 USD.
 */
export async function registrarTasa(tasa_ves: number) {
  const supabase = createClient()

  return supabase
    .from('tasas_cambio')
    .insert({ tasa_ves })
    .select()
    .single()
}
