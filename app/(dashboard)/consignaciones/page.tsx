import { getNotas } from '@/lib/actions/notas'
import ConsignacionesClient from './consignaciones-client'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ConsignacionesPage() {
  const { data: initialConsignaciones, error } = await getNotas('consignacion')

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Consignaciones</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lotes de libros entregados a vendedores externos con rendición y corte semanal de ventas y devoluciones.
          </p>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  // Cast compatible type without explicit 'any'
  return (
    <ConsignacionesClient
      initialConsignaciones={
        (initialConsignaciones as unknown as Parameters<typeof ConsignacionesClient>[0]['initialConsignaciones']) ?? []
      }
    />
  )
}
