import { Plus, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const movimientosMock = [
  {
    id: 'MOV-001',
    sku: 'INV-ACE-1L',
    producto: 'Aceite Premium 1L',
    tipo: 'entrada' as const,
    cantidad: 24,
    usuario: 'María Pérez',
    fecha: '12/08/2026 14:30',
  },
  {
    id: 'MOV-002',
    sku: 'INV-SEM-500',
    producto: 'Semillas Bolsa 500g',
    tipo: 'salida' as const,
    cantidad: 5,
    usuario: 'María Pérez',
    fecha: '12/08/2026 13:45',
  },
  {
    id: 'MOV-003',
    sku: 'INV-HAR-1K',
    producto: 'Harina Multiuso 1kg',
    tipo: 'entrada' as const,
    cantidad: 50,
    usuario: 'Administrador',
    fecha: '12/08/2026 11:20',
  },
  {
    id: 'MOV-004',
    sku: 'INV-MAR-500',
    producto: 'Margarina 500g',
    tipo: 'salida' as const,
    cantidad: 8,
    usuario: 'María Pérez',
    fecha: '12/08/2026 09:15',
  },
  {
    id: 'MOV-005',
    sku: 'INV-MAI-1L',
    producto: 'Aceite de Maíz 1L',
    tipo: 'entrada' as const,
    cantidad: 36,
    usuario: 'Administrador',
    fecha: '11/08/2026 16:00',
  },
]

export default function InventarioPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Control de Inventario
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Libro mayor de entradas y salidas — auditoría completa de movimientos de almacén.
          </p>
        </div>
        <Button
          id="btn-registrar-movimiento"
          variant="primary"
          aria-label="Registrar nuevo movimiento de inventario"
        >
          <Plus className="h-4 w-4" />
          Registrar Movimiento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>Registro cronológico de auditoría</CardDescription>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground font-medium bg-muted/60 px-3 py-1 rounded-full">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {movimientosMock.length} registros
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm" aria-label="Tabla de movimientos de inventario">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="hidden px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:table-cell">
                    Operador
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movimientosMock.map((mov) => (
                  <tr
                    key={mov.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground font-medium">
                      {mov.id}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block rounded-lg bg-muted px-2 py-0.5 font-mono text-xs text-foreground font-medium">
                        {mov.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{mov.producto}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={mov.tipo}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold tracking-tight text-foreground">
                      {mov.tipo === 'entrada' ? '+' : '-'}
                      {mov.cantidad}
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs text-muted-foreground sm:table-cell">{mov.usuario}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      {mov.fecha}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
