'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type TasaCambio = Database['public']['Tables']['tasas_cambio']['Row']

interface TasasContextProps {
  tasaUsd: number
  tasaEur: number
  sincronizando: boolean
  error: string | null
  sincronizarAhora: () => Promise<void>
}

const TasasContext = createContext<TasasContextProps | undefined>(undefined)

const TASA_FALLBACK_USD = 771.07
const TASA_FALLBACK_EUR = 889.45

export function TasasProvider({ children }: { children: React.ReactNode }) {
  const [tasaUsd, setTasaUsd] = useState<number>(TASA_FALLBACK_USD)
  const [tasaEur, setTasaEur] = useState<number>(TASA_FALLBACK_EUR)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarTasas = async () => {
    const supabase = createClient()
    
    // Obtener las últimas tasas de USD y EUR
    const { data, error: err } = await supabase
      .from('tasas_cambio')
      .select('*')
      .order('fecha_creacion', { ascending: false })

    if (err) {
      setError(err.message)
      return
    }

    if (data && data.length > 0) {
      const ultimas: Record<string, number> = {}
      for (const fila of data) {
        if (!ultimas[fila.moneda]) {
          ultimas[fila.moneda] = Number(fila.tasa)
        }
      }
      if (ultimas.USD) setTasaUsd(ultimas.USD)
      if (ultimas.EUR) setTasaEur(ultimas.EUR)
    }
  }

  const sincronizarAhora = async () => {
    setSincronizando(true)
    setError(null)
    try {
      const res = await fetch('/api/cron/sync-tasas', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al sincronizar tasas con el BCV')
      await cargarTasas()
    } catch (err) {
      const errorObj = err as Error
      setError(errorObj.message || 'Error de red')
    } finally {
      setSincronizando(false)
    }
  }

  useEffect(() => {
    let active = true

    // 1. Cargar las tasas iniciales de forma segura
    const inicializar = async () => {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('tasas_cambio')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (err) {
        if (active) setError(err.message)
        return
      }

      let ultimaFecha: number | null = null

      if (data && data.length > 0 && active) {
        const ultimas: Record<string, number> = {}
        for (const fila of data) {
          if (!ultimas[fila.moneda]) {
            ultimas[fila.moneda] = Number(fila.tasa)
            if (!ultimaFecha) {
              ultimaFecha = new Date(fila.fecha_creacion).getTime()
            }
          }
        }
        if (ultimas.USD) setTasaUsd(ultimas.USD)
        if (ultimas.EUR) setTasaEur(ultimas.EUR)
      }

      // Sincronización automática silenciosa si no hay datos o la tasa tiene más de 6 horas
      const haceSeisHoras = Date.now() - 6 * 60 * 60 * 1000
      const requiereSincronizacion = !ultimaFecha || ultimaFecha < haceSeisHoras

      if (requiereSincronizacion && active) {
        try {
          const res = await fetch('/api/cron/sync-tasas', { cache: 'no-store' })
          if (res.ok && active) {
            // Recargar tasas explícitamente como respaldo por si Realtime aún no está listo
            const supabase2 = createClient()
            const { data: dataNueva } = await supabase2
              .from('tasas_cambio')
              .select('*')
              .order('fecha_creacion', { ascending: false })

            if (dataNueva && dataNueva.length > 0 && active) {
              const ultimas2: Record<string, number> = {}
              for (const fila of dataNueva) {
                if (!ultimas2[fila.moneda]) {
                  ultimas2[fila.moneda] = Number(fila.tasa)
                }
              }
              if (ultimas2.USD) setTasaUsd(ultimas2.USD)
              if (ultimas2.EUR) setTasaEur(ultimas2.EUR)
            }
          }
        } catch {
          // Ignorar silenciosamente errores de red
        }
      }
    }

    inicializar()

    // 2. Suscribir a cambios en tiempo real
    const supabase = createClient()
    const canal = supabase
      .channel('tasas_cambio_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasas_cambio' },
        (payload) => {
          if (!active) return
          const nueva = payload.new as TasaCambio
          const valor = Number(nueva.tasa)
          if (nueva.moneda === 'USD') {
            setTasaUsd(valor)
          } else if (nueva.moneda === 'EUR') {
            setTasaEur(valor)
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(canal)
    }
  }, [])

  return (
    <TasasContext.Provider
      value={{
        tasaUsd,
        tasaEur,
        sincronizando,
        error,
        sincronizarAhora,
      }}
    >
      {children}
    </TasasContext.Provider>
  )
}

export function useTasas() {
  const context = useContext(TasasContext)
  if (context === undefined) {
    throw new Error('useTasas debe ser utilizado dentro de un TasasProvider')
  }
  return context
}
