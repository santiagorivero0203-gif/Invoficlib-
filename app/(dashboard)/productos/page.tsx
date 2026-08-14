import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const productosMock = [
  {
    id: 'PRD-001',
    nombre: 'Aceite Premium 1L',
    sku: 'INV-ACE-1L',
    stock: 142,
    stockMinimo: 20,
    precioUsd: 3.50,
    categoria: 'Aceites',
  },
  {
    id: 'PRD-002',
    nombre: 'Semillas Bolsa 500g',
    sku: 'INV-SEM-500',
    stock: 87,
    stockMinimo: 15,
    precioUsd: 2.25,
    categoria: 'Semillas',
  },
  {
    id: 'PRD-003',
    nombre: 'Harina Multiuso 1kg',
    sku: 'INV-HAR-1K',
    stock: 8,
    stockMinimo: 25,
    precioUsd: 1.80,
    categoria: 'Harinas',
  },
  {
    id: 'PRD-004',
    nombre: 'Margarina 500g',
    sku: 'INV-MAR-500',
    stock: 3,
    stockMinimo: 10,
    precioUsd: 2.90,
    categoria: 'Lácteos',
  },
  {
    id: 'PRD-005',
    nombre: 'Aceite de Maíz 1L',
    sku: 'INV-MAI-1L',
    stock: 56,
    stockMinimo: 15,
    precioUsd: 3.20,
    categoria: 'Aceites',
  },
  {
    id: 'PRD-006',
    nombre: 'Mantequilla Premium 250g',
    sku: 'INV-MAN-250',
    stock: 34,
    stockMinimo: 10,
    precioUsd: 4.10,
    categoria: 'Lácteos',
  },
]

function getStockBadge(stock: number, stockMinimo: number) {
  if (stock <= stockMinimo) return { variant: 'bajo' as const, label: 'Stock bajo' }
  return { variant: 'neutral' as const, label: 'Disponible' }
}

export default function ProductosPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Catálogo de Productos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión visual del catálogo — {productosMock.length} productos registrados en sistema.
          </p>
        </div>
        <Button id="btn-anadir-producto" variant="primary" aria-label="Añadir nuevo producto al catálogo">
          <Plus className="h-4 w-4" />
          Añadir Producto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {productosMock.map((producto) => {
          const stockInfo = getStockBadge(producto.stock, producto.stockMinimo)

          return (
            <Card
              key={producto.id}
              className="group relative overflow-hidden p-1 transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground border border-border transition-transform duration-300 group-hover:scale-105">
                    <Package className="h-5 w-5 text-primary-accent" />
                  </div>
                  <Badge variant={stockInfo.variant}>{stockInfo.label}</Badge>
                </div>
                <CardTitle className="mt-4 text-base font-bold text-foreground">{producto.nombre}</CardTitle>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{producto.categoria}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground font-medium">
                    {producto.sku}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-end justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Stock actual</p>
                    <p className="font-mono text-xl font-bold tracking-tight text-foreground mt-0.5">
                      {producto.stock}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        / mín. {producto.stockMinimo}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium">Precio USD</p>
                    <p className="font-mono text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${producto.precioUsd.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
