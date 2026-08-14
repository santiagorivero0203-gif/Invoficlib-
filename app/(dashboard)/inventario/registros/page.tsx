import { getMovimientos } from '@/lib/actions/movimientos'
import { getProductosConStock } from '@/lib/actions/productos'
import RegistrosClient from './registros-client'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'

interface RegistrosPageProps {
  searchParams?: Promise<{ tipo?: string }>
}

export const dynamic = 'force-dynamic'

export default async function RegistrosPage({ searchParams }: RegistrosPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const tipoInicial = (resolvedSearchParams?.tipo as 'todos' | 'entrada' | 'salida') || 'todos'

  const [movResult, prodResult] = await Promise.all([
    getMovimientos(tipoInicial === 'todos' ? undefined : tipoInicial),
    getProductosConStock(),
  ])

  const error = movResult.error ?? prodResult.error

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Historial de Movimientos</h2>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  // Cast compatible type without explicit 'any'
  return (
    <RegistrosClient
      initialMovimientos={
        (movResult.data as unknown as Parameters<typeof RegistrosClient>[0]['initialMovimientos']) ?? []
      }
      initialProductos={prodResult.data ?? []}
      tipoInicial={tipoInicial}
    />
  )
}
