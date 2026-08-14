import { getClientes } from '@/lib/actions/clientes'
import ClientesClient from './clientes-client'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  const { data: initialClientes, error } = await getClientes()

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h2>
          <p className="text-muted-foreground">
            Gestiona tu base de clientes: colegios, vendedores y público general.
          </p>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  return <ClientesClient initialClientes={initialClientes ?? []} />
}
