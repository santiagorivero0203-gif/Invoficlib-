import Link from 'next/link'
import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getProductosConStock } from '@/lib/actions/productos'
import { getMovimientos } from '@/lib/actions/movimientos'
import { formatUsd } from '@/lib/format'
import { errorMessage } from '@/lib/utils'
import { ErrorMessage } from '@/components/ui/error-message'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

export const dynamic = 'force-dynamic'

/**
 * Dashboard principal — Adaptativo:
 * - Móvil: grid 2×2 compacto, tipografía reducida (estilo Fina)
 * - Desktop: layout espacioso con cards grandes y números prominentes
 * Cards clickeables redirigen a su sección correspondiente.
 */
export default async function DashboardHome() {
  const [prodResult, movResult] = await Promise.all([
    getProductosConStock(),
    getMovimientos(),
  ])

  const error = prodResult.error ?? movResult.error

  if (error) {
    return (
      <div className="space-y-4 md:space-y-8 animate-fade-in">
        <DashboardHeader />
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

  // ── CÁLCULO DE MÉTRICAS ──────────────────────────
  const totalProductos = productos.length
  const conStock = productos.filter(p => p.stock > 0).length
  const valorTotalInventario = productos.reduce(
    (acc, p) => acc + (p.stock * (p.precio_usd || 0)),
    0
  )

  const hoyStr = new Date().toISOString().split('T')[0]
  const movimientosHoy = movimientos.filter(m =>
    m.fecha_creacion.startsWith(hoyStr)
  )

  const entradasHoy = movimientosHoy
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.cantidad, 0)
  const countEntradasHoy = movimientosHoy.filter(m => m.tipo === 'entrada').length
  const salidasHoy = movimientosHoy
    .filter(m => m.tipo === 'salida')
    .reduce((acc, m) => acc + m.cantidad, 0)
  const countSalidasHoy = movimientosHoy.filter(m => m.tipo === 'salida').length

  // Totales históricos como fallback
  const totalEntradas = movimientos
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.cantidad, 0)
  const totalSalidas = movimientos
    .filter(m => m.tipo === 'salida')
    .reduce((acc, m) => acc + m.cantidad, 0)

  // Alertas de stock
  const alertasStock = productos.filter(p => p.stock <= (p.stock_minimo ?? 0))
  const agotados = productos.filter(p => p.stock === 0)
  const stockBajo = alertasStock.filter(p => p.stock > 0)

  // Top Productos Más Vendidos (agrupando salidas del ledger)
  const ventasPorProducto = new Map<string, { nombre: string; sku: string; unidades: number; totalUsd: number }>()
  for (const m of movimientos) {
    if (m.tipo === 'salida' && m.productos) {
      const sku = m.productos.codigo_sku
      const actual = ventasPorProducto.get(sku) || {
        nombre: m.productos.nombre,
        sku: m.productos.codigo_sku,
        unidades: 0,
        totalUsd: 0,
      }
      actual.unidades += m.cantidad
      actual.totalUsd += m.cantidad * (m.productos.precio_usd || 0)
      ventasPorProducto.set(sku, actual)
    }
  }

  const topVendidos = Array.from(ventasPorProducto.values())
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 4)

  const maxUnidadesVendidas = topVendidos.length > 0 ? Math.max(...topVendidos.map(t => t.unidades)) : 1

  // Últimos movimientos
  const movimientosRecientes = movimientos.slice(0, 5)

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header con tasas en vivo (client component) */}
      <DashboardHeader />

      {/* ═══ GRID DE MÉTRICAS ═══
          Móvil: 2×2 compacto
          Desktop: 4 columnas espaciosas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">

        {/* ── Productos ── */}
        <Link href="/inventario" className="group">
          <Card className="relative overflow-hidden h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
            <CardContent className="p-3.5 md:p-5">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Productos
                </span>
                <div className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                  <Package className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalProductos}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1.5 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                {conStock} con stock
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* ── Valor Inventario ── */}
        <Link href="/resumen-financiero/utilidad-perdida" className="group">
          <Card className="relative overflow-hidden h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
            <CardContent className="p-3.5 md:p-5">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Inventario
                </span>
                <div className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-amber-50 dark:bg-amber-500/10">
                  <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{formatUsd(valorTotalInventario)}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1.5">Precio USD base</p>
            </CardContent>
          </Card>
        </Link>

        {/* ── Entradas ── */}
        <Link href="/inventario/registros?tipo=entrada" className="group">
          <Card className="relative overflow-hidden h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-sky-400 to-sky-500" />
            <CardContent className="p-3.5 md:p-5">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {entradasHoy > 0 ? 'Entradas hoy' : 'Entradas'}
                </span>
                <div className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-sky-50 dark:bg-sky-500/10">
                  <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {entradasHoy > 0 ? entradasHoy : totalEntradas}
              </p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1.5">
                {entradasHoy > 0 ? `${countEntradasHoy} registros hoy` : 'total histórico'}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* ── Salidas ── */}
        <Link href="/inventario/registros?tipo=salida" className="group">
          <Card className="relative overflow-hidden h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <div className="absolute top-0 left-0 w-full h-0.5 md:h-1 bg-gradient-to-r from-violet-400 to-violet-500" />
            <CardContent className="p-3.5 md:p-5">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {salidasHoy > 0 ? 'Salidas hoy' : 'Salidas'}
                </span>
                <div className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg md:rounded-xl bg-violet-50 dark:bg-violet-500/10">
                  <ArrowDownRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {salidasHoy > 0 ? salidasHoy : totalSalidas}
              </p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 md:mt-1.5">
                {salidasHoy > 0 ? `${countSalidasHoy} registros hoy` : 'total histórico'}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ═══ ALERTA DE INVENTARIO BAJO ═══ */}
      {alertasStock.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
          <CardContent className="p-3.5 md:p-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs md:text-sm font-semibold text-foreground">Alerta de inventario bajo</span>
              <Link href="/inventario" className="text-[11px] md:text-xs font-medium text-primary-accent flex items-center gap-0.5 hover:underline">
                Ver todo <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-lg md:text-xl font-bold text-foreground">{stockBajo.length}</span>
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground">Inventario bajo</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-lg md:text-xl font-bold text-foreground">{agotados.length}</span>
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground">Agotados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ SECCIONES SECUNDARIAS ANALÍTICAS ═══ */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
        {/* Productos Más Vendidos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="md:text-base">Más Vendidos</CardTitle>
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Top Salidas
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {topVendidos.length === 0 ? (
              <div className="py-6 md:py-8 text-center text-xs text-muted-foreground">
                <Clock className="mx-auto h-6 w-6 md:h-8 md:w-8 opacity-30 mb-1.5" />
                Sin ventas registradas aún.
              </div>
            ) : (
              <div className="space-y-3">
                {topVendidos.map((prod) => {
                  const pct = Math.min(100, Math.round((prod.unidades / maxUnidadesVendidas) * 100))

                  return (
                    <div key={prod.sku} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1 truncate pr-2">
                          <span className="font-mono text-[10px] text-muted-foreground mr-1.5">
                            {prod.sku}
                          </span>
                          <span className="font-semibold text-foreground truncate">
                            {prod.nombre}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-foreground">{prod.unidades} uds</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">({formatUsd(prod.totalUsd)})</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-accent to-violet-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Movimientos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="md:text-base">Últimos Movimientos</CardTitle>
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Libro Mayor
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {movimientosRecientes.length === 0 ? (
              <div className="py-6 md:py-8 text-center text-xs text-muted-foreground">
                <Clock className="mx-auto h-6 w-6 md:h-8 md:w-8 opacity-30 mb-1.5" />
                Sin movimientos registrados.
              </div>
            ) : (
              <div className="space-y-0.5">
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
                      className="flex items-center justify-between rounded-lg py-2 px-2 md:py-2.5 md:px-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] md:text-xs text-muted-foreground">
                            {prodSku}
                          </span>
                          <span className="truncate text-xs md:text-sm font-medium text-foreground">
                            {prodNombre}
                          </span>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{fechaCorta} {horaStr}</span>
                          {item.notas?.cliente_nombre && (
                            <>
                              {' · '}
                              <span className="truncate">{item.notas.cliente_nombre}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant={item.tipo} className="ml-2 shrink-0 font-mono text-[10px] md:text-xs">
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
              <CardTitle className="md:text-base">Stock Crítico</CardTitle>
              {alertasStock.length > 0 ? (
                <Badge variant="bajo" className="text-[10px] md:text-xs">Atención ({alertasStock.length})</Badge>
              ) : (
                <Badge variant="disponible" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] md:text-xs">
                  OK
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alertasStock.length === 0 ? (
              <div className="py-6 md:py-8 text-center text-xs md:text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto h-6 w-6 md:h-8 md:w-8 text-emerald-500 opacity-50 mb-1.5" />
                Todos los productos en niveles óptimos.
              </div>
            ) : (
              <div className="space-y-0.5">
                {alertasStock.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg py-2 px-2 md:py-2.5 md:px-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] md:text-xs text-muted-foreground">
                          {item.codigo_sku}
                        </span>
                        <span className="truncate text-xs md:text-sm font-medium text-foreground">
                          {item.nombre}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 font-mono">
                        mín. {item.stock_minimo ?? 0} uds.
                      </p>
                    </div>
                    <Badge variant="bajo" className="ml-2 shrink-0 font-mono text-[10px] md:text-xs">
                      {item.stock}/{item.stock_minimo ?? 0}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
