import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getProductosConStock } from '@/lib/actions/productos'
import { getMovimientos } from '@/lib/actions/movimientos'
import { formatUsd } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { ErrorMessage } from '@/components/ui/error-message'

export const dynamic = 'force-dynamic'

/**
 * Vista principal del Dashboard.
 * Consume datos reales del Ledger de Supabase en tiempo de servidor.
 */
export default async function DashboardHome() {
  const [prodResult, movResult] = await Promise.all([
    getProductosConStock(),
    getMovimientos(),
  ])

  const error = prodResult.error ?? movResult.error

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Panel de Control</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen y estado actual del inventario general de Invoficlib
          </p>
        </div>
        <ErrorMessage message={errorMessage(error)} />
      </div>
    )
  }

  const productos = prodResult.data ?? []
  const movimientos = (movResult.data ?? []) as Array<{
    id: string
    tipo: 'entrada' | 'salida'
    cantidad: number
    motivo?: string | null
    fecha_creacion: string
    productos?: {
      nombre: string
      codigo_sku: string
      precio_usd: number
    } | null
    notas?: {
      correlativo: string
      cliente_nombre: string
      tipo_salida: string
    } | null
  }>

  // ── 1. CÁLCULO DE MÉTRICAS EN VIVO ──────────────────────────
  const totalProductos = productos.length
  const valorTotalInventario = productos.reduce(
    (acc, p) => acc + (p.stock * (p.precio_usd || 0)),
    0
  )

  // Calcular movimientos de hoy
  const hoyStr = new Date().toISOString().split('T')[0]
  const movimientosHoy = movimientos.filter((m) =>
    m.fecha_creacion.startsWith(hoyStr)
  )

  const entradasHoy = movimientosHoy
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.cantidad, 0)
  const countEntradasHoy = movimientosHoy.filter((m) => m.tipo === 'entrada').length

  const salidasHoy = movimientosHoy
    .filter((m) => m.tipo === 'salida')
    .reduce((acc, m) => acc + m.cantidad, 0)
  const countSalidasHoy = movimientosHoy.filter((m) => m.tipo === 'salida').length

  // Si hoy no hay movimientos, mostrar los acumulados totales como contexto útil
  const totalEntradasHistoricas = movimientos
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.cantidad, 0)
  const totalSalidasHistoricas = movimientos
    .filter((m) => m.tipo === 'salida')
    .reduce((acc, m) => acc + m.cantidad, 0)

  const stats = [
    {
      name: 'Total de Productos',
      value: totalProductos.toString(),
      icon: Package,
      change: `${productos.filter((p) => p.stock > 0).length} con stock disponible`,
      changeType: 'positive' as const,
      accent: 'border-l-emerald-500',
    },
    {
      name: 'Entradas (Hoy)',
      value: entradasHoy > 0 ? entradasHoy.toString() : totalEntradasHistoricas.toString(),
      unit: 'items',
      icon: ArrowUpRight,
      change: entradasHoy > 0 ? `${countEntradasHoy} registros hoy` : 'Total histórico',
      changeType: 'neutral' as const,
      accent: 'border-l-sky-500',
    },
    {
      name: 'Salidas (Hoy)',
      value: salidasHoy > 0 ? salidasHoy.toString() : totalSalidasHistoricas.toString(),
      unit: 'items',
      icon: ArrowDownRight,
      change: salidasHoy > 0 ? `${countSalidasHoy} registros hoy` : 'Total histórico',
      changeType: 'neutral' as const,
      accent: 'border-l-violet-500',
    },
    {
      name: 'Valor del Inventario',
      value: formatUsd(valorTotalInventario),
      icon: DollarSign,
      change: 'En base a precio USD',
      changeType: 'positive' as const,
      accent: 'border-l-amber-500',
    },
  ]

  // ── 2. ALERTAS DE STOCK CRÍTICO REALES ───────────────────────
  const alertasStock = productos.filter((p) => p.stock <= (p.stock_minimo ?? 0))

  // ── 3. ÚLTIMOS MOVIMIENTOS REALES ────────────────────────────
  const movimientosRecientes = movimientos.slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Panel de Control</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen y estado en tiempo real del inventario general de Invoficlib
          </p>
        </div>

        <div className="text-xs md:text-right text-muted-foreground">
          <p className="font-semibold text-foreground">Servidor Activo</p>
          <p className="font-mono tracking-tight mt-0.5 capitalize">
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
        {/* Últimos Movimientos */}
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
            {movimientosRecientes.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 opacity-40 mb-2" />
                No hay movimientos registrados en el inventario.
              </div>
            ) : (
              <div className="space-y-1.5">
                {movimientosRecientes.map((item) => {
                  const prodNombre = item.productos?.nombre || item.motivo || 'Producto'
                  const prodSku = item.productos?.codigo_sku || 'S/C'
                  const fechaObj = new Date(item.fecha_creacion)
                  const horaStr = fechaObj.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const fechaCorta = fechaObj.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                  })

                  return (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-muted-foreground">
                            {prodSku}
                          </span>
                          <span className="truncate text-sm font-semibold text-foreground">
                            {prodNombre}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono tracking-tight">{fechaCorta} {horaStr}</span>
                          {item.notas?.cliente_nombre && (
                            <>
                              {' · '}
                              <span className="truncate">{item.notas.cliente_nombre}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant={item.tipo} className="ml-3 shrink-0 font-mono">
                        {item.tipo === 'entrada' ? '+' : '-'}
                        {item.cantidad}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas de Stock Crítico */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alertas de Stock Crítico</CardTitle>
              {alertasStock.length > 0 ? (
                <Badge variant="bajo">Atención requerida ({alertasStock.length})</Badge>
              ) : (
                <Badge variant="disponible" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Todo en orden
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alertasStock.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 opacity-60 mb-2" />
                Todos los productos se encuentran en niveles óptimos de stock.
              </div>
            ) : (
              <div className="space-y-1.5">
                {alertasStock.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-muted-foreground">
                          {item.codigo_sku}
                        </span>
                        <span className="truncate text-sm font-semibold text-foreground">
                          {item.nombre}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs tracking-tight text-muted-foreground">
                        mín. {item.stock_minimo ?? 0} uds.
                      </p>
                    </div>
                    <Badge variant="bajo" className="ml-3 shrink-0 font-mono">
                      {item.stock}/{item.stock_minimo ?? 0}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

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
