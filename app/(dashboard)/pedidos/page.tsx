import { getNotas } from '@/lib/actions/notas'
import PedidosClient from './pedidos-client'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const { data: initialNotas, error } = await getNotas()

  if (error) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Pedidos</h2>
          <p className="text-muted-foreground text-sm">
            Listado e historial de ventas directas realizadas y devoluciones.
          </p>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  return <PedidosClient initialNotas={initialNotas ?? []} />
}
