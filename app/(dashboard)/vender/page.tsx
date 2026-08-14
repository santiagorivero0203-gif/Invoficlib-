import { getProductosConStock } from '@/lib/actions/productos'
import { getTasaVigente } from '@/lib/actions/tasa'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'
import VenderClient from './vender-client'

/**
 * Punto de Venta — Fase 3.
 * La carga de datos (catálogo + tasa vigente) ocurre en el servidor
 * para que el catálogo llegue completo al primer render; el estado
 * interactivo (carrito, búsqueda, moneda) vive en VenderClient.
 */
export const dynamic = 'force-dynamic'

export default async function VenderPage() {
  const [productosResult, tasaResult] = await Promise.all([
    getProductosConStock(),
    getTasaVigente(),
  ])

  const error = productosResult.error ?? tasaResult.error
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
    />
  )
}
