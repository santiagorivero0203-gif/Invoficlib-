import { getProductosConStock } from '@/lib/actions/productos'
import { getClientes } from '@/lib/actions/clientes'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'
import VenderClient from './vender-client'

/**
 * Punto de Venta — Fase 3.
 * La carga de datos (catálogo y clientes) ocurre en el servidor.
 * La tasa vigente se obtiene del contexto global (TasasProvider) en el cliente.
 */
export const dynamic = 'force-dynamic'

export default async function VenderPage() {
  const [productosResult, clientesResult] = await Promise.all([
    getProductosConStock(),
    getClientes(),
  ])

  const error = productosResult.error ?? clientesResult.error
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
      clientes={clientesResult.data ?? []}
    />
  )
}
