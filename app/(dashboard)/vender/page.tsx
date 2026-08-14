import { getProductosConStock } from '@/lib/actions/productos'
import { getTasaVigente } from '@/lib/actions/tasa'
import { getClientes } from '@/lib/actions/clientes'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'
import VenderClient from './vender-client'

/**
 * Punto de Venta — Fase 3.
 * La carga de datos (catálogo, tasa vigente, y clientes) ocurre en el servidor.
 */
export const dynamic = 'force-dynamic'

export default async function VenderPage() {
  const [productosResult, tasaResult, clientesResult] = await Promise.all([
    getProductosConStock(),
    getTasaVigente(),
    getClientes(),
  ])

  const error = productosResult.error ?? tasaResult.error ?? clientesResult.error
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Punto de Venta</h2>
          <p className="text-muted-foreground">Emite notas y registra detalles de venta.</p>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  return (
    <VenderClient
      productos={productosResult.data ?? []}
      tasaVes={tasaResult.data?.tasa_ves ?? null}
      clientes={clientesResult.data ?? []}
    />
  )
}
