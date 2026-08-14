/**
 * lib/actions/clientes.ts
 * -------------------------------------------------------
 * CRUD de la tabla `clientes` para el módulo de gestión
 * de clientes (Fase 3). Los clientes se asocian a notas
 * para trazabilidad de ventas, promociones y consignaciones.
 *
 * Tipos de cliente:
 *   - 'colegio':   Instituciones educativas (pedidos por lotes)
 *   - 'vendedor':  Vendedores ambulantes (consignaciones)
 *   - 'general':   Clientes al detalle
 * -------------------------------------------------------
 */

import { createClient } from '@/lib/supabase/client'
import type { Database, TipoCliente } from '@/types/database.types'

// ── Tipos de conveniencia ────────────────────────────────
export type Cliente = Database['public']['Tables']['clientes']['Row']
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert']
export type ClienteUpdate = Database['public']['Tables']['clientes']['Update']

// ── CONSULTAS ────────────────────────────────────────────

/**
 * Lista todos los clientes ordenados por nombre.
 * Opcionalmente filtra por tipo de cliente.
 *
 * @param filtroTipo - Filtra por tipo de cliente ('colegio', 'vendedor', 'general').
 *                     Si es undefined, retorna todos.
 */
export async function getClientes(filtroTipo?: TipoCliente) {
  const supabase = createClient()

  let query = supabase
    .from('clientes')
    .select('*')
    .order('nombre')

  if (filtroTipo) {
    query = query.eq('tipo', filtroTipo)
  }

  return query
}

/**
 * Busca clientes por nombre (búsqueda parcial, case-insensitive).
 * Útil para el buscador del POS al seleccionar cliente.
 *
 * @param termino - Texto de búsqueda.
 */
export async function buscarClientes(termino: string) {
  const supabase = createClient()

  return supabase
    .from('clientes')
    .select('*')
    .ilike('nombre', `%${termino}%`)
    .order('nombre')
    .limit(10)
}

/**
 * Obtiene un cliente específico por su ID.
 *
 * @param id - UUID del cliente.
 */
export async function getCliente(id: string) {
  const supabase = createClient()

  return supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()
}

// ── MUTACIONES ───────────────────────────────────────────

/**
 * Crea un nuevo cliente en el sistema.
 *
 * @param cliente - Campos del cliente (nombre es obligatorio, tipo default 'general').
 */
export async function crearCliente(
  cliente: Omit<ClienteInsert, 'id' | 'fecha_creacion'>
) {
  const supabase = createClient()

  return supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single()
}

/**
 * Actualiza un cliente existente.
 *
 * @param id    - UUID del cliente a actualizar.
 * @param datos - Campos parciales a actualizar.
 */
export async function actualizarCliente(id: string, datos: ClienteUpdate) {
  const supabase = createClient()

  return supabase
    .from('clientes')
    .update(datos)
    .eq('id', id)
    .select()
    .single()
}

/**
 * Elimina un cliente. Solo permitido para admin (Jefe) por RLS.
 * Si el cliente tiene notas asociadas, la FK queda como SET NULL
 * en la nota, preservando el historial.
 *
 * @param id - UUID del cliente a eliminar.
 */
export async function eliminarCliente(id: string) {
  const supabase = createClient()

  return supabase
    .from('clientes')
    .delete()
    .eq('id', id)
}
