import { getProductosConStock } from '@/lib/actions/productos'
import InventarioClient from './inventario-client'
import { ErrorMessage } from '@/components/ui/error-message'
import { errorMessage } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const { data: initialProductos, error } = await getProductosConStock()

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Inventario General</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de libros y stock físico disponible en bodega central.
          </p>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  // Cast compatible type
  return <InventarioClient initialProductos={(initialProductos as any) ?? []} />
}
