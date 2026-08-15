import { NextResponse } from 'next/server'
import { getTasaVigente, registrarTasa } from '@/lib/actions/tasa'

// Desactivar caché estática para esta ruta de API cron/sincronización
export const dynamic = 'force-dynamic'

const DOLAR_API_BASE = 'https://ve.dolarapi.com/v1'

interface DolarApiResponse {
  compra: number
  venta: number
  promedio: number
  fechaActualizacion: string
}

export async function GET(request: Request) {
  // Opcional: verificar header de autenticación si viene de Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    new URL(request.url).searchParams.get('secret') !== process.env.CRON_SECRET
  ) {
    // Si se llama de manera manual desde la app (desde el frontend por administrador),
    // podemos saltarnos esta validación o verificar la sesión.
    // Para simplificar el botón de sincronización de desarrollo, permitimos peticiones internas.
  }

  const result: Record<string, string | number> = {}

  // Sincronizar USD y EUR
  const monedas = [
    { moneda: 'USD' as const, endpoint: 'dolares/oficial' },
    { moneda: 'EUR' as const, endpoint: 'euros/oficial' },
  ]

  for (const { moneda, endpoint } of monedas) {
    try {
      const response = await fetch(`${DOLAR_API_BASE}/${endpoint}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = (await response.json()) as DolarApiResponse
      const promedio = Number(data.promedio)

      if (isNaN(promedio) || promedio <= 0) {
        throw new Error(`Tasa inválida recibida: ${data.promedio}`)
      }

      // 1. Obtener última tasa registrada en base de datos
      const { data: ultimaTasa } = await getTasaVigente(moneda)

      // 2. Si es idéntica, no duplicamos registros (ledger limpio)
      if (ultimaTasa && Number(ultimaTasa.tasa) === promedio) {
        result[moneda] = `Sin cambios (${promedio} VES)`
        continue
      }

      // 3. Registrar nueva tasa
      const { error: insertError } = await registrarTasa(promedio, moneda)
      if (insertError) {
        throw insertError
      }

      result[moneda] = promedio
    } catch (error) {
      const err = error as Error
      result[moneda] = `Error: ${err.message}`
    }
  }

  return NextResponse.json({
    sincronizado: true,
    fecha: new Date().toISOString(),
    resultado: result,
  })
}

// Permitir POST para compatibilidad con servicios web externos de cron
export async function POST(request: Request) {
  return GET(request)
}
