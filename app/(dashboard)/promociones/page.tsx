import { getNotas } from '@/lib/actions/notas'
import PromocionesClient from './promociones-client'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PromocionesPage() {
  const { data: initialPromociones, error } = await getNotas('promocion')

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Promociones & Muestras</h2>

        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  // Cast compatible type without explicit 'any'
  return (
    <PromocionesClient
      initialPromociones={
        (initialPromociones as unknown as Parameters<typeof PromocionesClient>[0]['initialPromociones']) ?? []
      }
    />
  )
}
