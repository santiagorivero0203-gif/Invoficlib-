import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  DollarSign,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const stats = [
  {
    name: 'Total de Productos',
    value: '142',
    icon: Package,
    change: '+4 nuevos este mes',
    changeType: 'positive' as const,
    accent: 'border-l-emerald-500',
  },
  {
    name: 'Entradas (Hoy)',
    value: '48',
    unit: 'items',
    icon: ArrowUpRight,
    change: '8 registros',
    changeType: 'neutral' as const,
    accent: 'border-l-sky-500',
  },
  {
    name: 'Salidas (Hoy)',
    value: '32',
    unit: 'items',
    icon: ArrowDownRight,
    change: '12 registros',
    changeType: 'neutral' as const,
    accent: 'border-l-violet-500',
  },
  {
    name: 'Valor del Inventario',
    value: '$12,450.00',
    icon: DollarSign,
    change: 'En base a precio USD',
    changeType: 'positive' as const,
    accent: 'border-l-amber-500',
  },
]

const movimientosRecientes = [
  { id: 1, codigo: 'INV-ACE-1L', prod: 'Aceite Premium 1L', tipo: 'entrada' as const, cant: 24, user: 'María Pérez', hora: '14:30' },
  { id: 2, codigo: 'INV-SEM-500', prod: 'Semillas Bolsa 500g', tipo: 'salida' as const, cant: 5, user: 'María Pérez', hora: '13:45' },
  { id: 3, codigo: 'INV-HAR-1K', prod: 'Harina Multiuso 1kg', tipo: 'entrada' as const, cant: 50, user: 'Administrador', hora: '11:20' },
  { id: 4, codigo: 'INV-ACE-1L', prod: 'Aceite Premium 1L', tipo: 'salida' as const, cant: 12, user: 'María Pérez', hora: '09:15' },
]

const alertasStock = [
  { id: 1, codigo: 'INV-MAI-1L', prod: 'Aceite de Maíz 1L', stock: 3, min: 10 },
  { id: 2, codigo: 'INV-MAR-500', prod: 'Margarina 500g', stock: 1, min: 5 },
]

export default function DashboardHome() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Panel de Control</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen y estado actual del inventario general de Invoficlib
          </p>
        </div>

        <div className="text-xs md:text-right text-muted-foreground">
          <p className="font-semibold text-foreground">Servidor Activo</p>
          <p className="font-mono tracking-tight mt-0.5">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Bento Grid — métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {stats.map((stat) => (
          <Card
            key={stat.name}
            className="p-6 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.name}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                <stat.icon className="h-4 w-4 text-primary-accent" />
              </div>
            </div>

            <div className="mt-4">
              <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
                {'unit' in stat && stat.unit && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{stat.unit}</span>
                )}
              </span>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {stat.changeType === 'positive' && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{stat.change}</span>
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Bento Grid — secciones secundarias */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Últimos Movimientos de Inventario</CardTitle>
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Libro Mayor
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {movimientosRecientes.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-muted-foreground">
                        {item.codigo}
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {item.prod}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono tracking-tight">{item.hora}</span>
                      {' · '}
                      {item.user}
                    </p>
                  </div>
                  <Badge variant={item.tipo} className="ml-3 shrink-0 font-mono">
                    {item.tipo === 'entrada' ? '+' : '-'}
                    {item.cant}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alertas de Stock Crítico</CardTitle>
              <Badge variant="bajo">Atención requerida</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {alertasStock.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-muted-foreground">
                        {item.codigo}
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {item.prod}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs tracking-tight text-muted-foreground">
                      mín. {item.min} uds.
                    </p>
                  </div>
                  <Badge variant="bajo" className="ml-3 shrink-0 font-mono">
                    {item.stock}/{item.min}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-primary-accent/15 bg-primary-accent/5 p-3.5 text-xs leading-relaxed text-foreground">
              <strong className="text-primary-accent">Alertas automáticas:</strong> Estos límites críticos notificarán
              automáticamente cuando el inventario caiga por debajo de la reserva mínima.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
