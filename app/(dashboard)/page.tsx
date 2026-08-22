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
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Vista principal del Dashboard — Mobile-first, inspirada en Fina.
 * Grid 2×2 compacto, tipografía reducida, colores de acento y tasas contextuales.
 */
export default async function DashboardHome() {
  // Obtener datos reales del servidor
  const [prodResult, movResult] = await Promise.all([
    getProductosConStock(),
    getMovimientos(),
  ])

  // Obtener tasas para mostrar como info contextual
  const supabase = await createClient()
  const { data: tasasRaw } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', ['tasa_usd', 'tasa_eur'])

  const tasasData = (tasasRaw ?? []) as Array<{ clave: string; valor: number }>
  const tasaUsd = tasasData.find(t => t.clave === 'tasa_usd')?.valor ?? 0
  const tasaEur = tasasData.find(t => t.clave === 'tasa_eur')?.valor ?? 0

  const error = prodResult.error ?? movResult.error

  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Panel de Control</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Resumen del inventario de Invoficlib
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
  const salidasHoy = movimientosHoy
    .filter(m => m.tipo === 'salida')
    .reduce((acc, m) => acc + m.cantidad, 0)

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

  // Últimos movimientos
  const movimientosRecientes = movimientos.slice(0, 5)

  // Fecha formateada
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header: Saludo + Fecha + Tasas */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
          Panel de Control
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="capitalize">{fechaHoy}</span>
          <span className="text-border">•</span>
          <span className="font-medium">
            <span className="text-primary-accent">$</span> {Number(tasaUsd).toFixed(2)} Bs.
          </span>
          <span className="text-border">•</span>
          <span className="font-medium">
            <span className="text-amber-500">€</span> {Number(tasaEur).toFixed(2)} Bs.
          </span>
        </div>
      </div>

      {/* Grid 2×2 de métricas — estilo Fina */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* Productos */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="p-3.5 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Productos</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <Package className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalProductos}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {conStock} con stock
            </p>
          </CardContent>
        </Card>

        {/* Valor inventario */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="p-3.5 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Inventario</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{formatUsd(valorTotalInventario)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Precio USD base</p>
          </CardContent>
        </Card>

        {/* Entradas */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-sky-400 to-sky-500" />
          <CardContent className="p-3.5 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {entradasHoy > 0 ? 'Entradas hoy' : 'Entradas'}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/10">
                <ArrowUpRight className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {entradasHoy > 0 ? entradasHoy : totalEntradas}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {entradasHoy > 0 ? 'unidades registradas' : 'total histórico'}
            </p>
          </CardContent>
        </Card>

        {/* Salidas */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-violet-400 to-violet-500" />
          <CardContent className="p-3.5 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {salidasHoy > 0 ? 'Salidas hoy' : 'Salidas'}
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
                <ArrowDownRight className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {salidasHoy > 0 ? salidasHoy : totalSalidas}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {salidasHoy > 0 ? 'unidades registradas' : 'total histórico'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de inventario bajo — estilo Fina */}
      {alertasStock.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-foreground">Alerta de inventario bajo</span>
              <a href="/inventario" className="text-[11px] font-medium text-primary-accent flex items-center gap-0.5 hover:underline">
                Ver todo <ChevronRight className="h-3 w-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-lg font-bold text-foreground">{stockBajo.length}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Inventario bajo</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-lg font-bold text-foreground">{agotados.length}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Agotados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secciones secundarias */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {/* Últimos Movimientos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Últimos Movimientos</CardTitle>
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                Libro Mayor
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {movimientosRecientes.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Clock className="mx-auto h-6 w-6 opacity-30 mb-1.5" />
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
                      className="flex items-center justify-between rounded-lg py-2 px-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {prodSku}
                          </span>
                          <span className="truncate text-xs font-medium text-foreground">
                            {prodNombre}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <span className="font-mono">{fechaCorta} {horaStr}</span>
                          {item.notas?.cliente_nombre && (
                            <>
                              {' · '}
                              <span className="truncate">{item.notas.cliente_nombre}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Badge variant={item.tipo} className="ml-2 shrink-0 font-mono text-[10px]">
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
              <CardTitle>Stock Crítico</CardTitle>
              {alertasStock.length > 0 ? (
                <Badge variant="bajo" className="text-[10px]">Atención ({alertasStock.length})</Badge>
              ) : (
                <Badge variant="disponible" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                  OK
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alertasStock.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 opacity-50 mb-1.5" />
                Todos los productos en niveles óptimos.
              </div>
            ) : (
              <div className="space-y-0.5">
                {alertasStock.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg py-2 px-2 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {item.codigo_sku}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {item.nombre}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        mín. {item.stock_minimo ?? 0} uds.
                      </p>
                    </div>
                    <Badge variant="bajo" className="ml-2 shrink-0 font-mono text-[10px]">
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
