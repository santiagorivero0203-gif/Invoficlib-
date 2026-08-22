'use client'

/**
 * app/(dashboard)/resumen-financiero/utilidad-perdida/utilidad-perdida-client.tsx
 * -------------------------------------------------------
 * Vista de Utilidad / Pérdida y Análisis de Capital.
 * Inspirada en el módulo financiero con estética Apple / Glassmorphism:
 * 1. KPIs de Utilidad (Ingresos, Costos, Utilidad Bruta, Gastos, Utilidad Neta).
 * 2. Gráfico mensual de barras interactivo de Ingresos vs Utilidad Neta.
 * 3. Hero Card de Total de Capital con gradiente destacado.
 * 4. Desglose de activos (Inventario, Cuentas Bancarias, Por Cobrar, Por Pagar).
 * 5. Gráfico de dona de Valor de Activos.
 * -------------------------------------------------------
 */

import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Wallet,
  Building2,
  Receipt,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Percent,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { UtilidadPerdidaData } from '@/lib/actions/resumen-financiero'

interface UtilidadPerdidaClientProps {
  initialData: UtilidadPerdidaData
}

export default function UtilidadPerdidaClient({ initialData }: UtilidadPerdidaClientProps) {
  const [data] = useState<UtilidadPerdidaData>(initialData)
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('todos')
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(2026)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null)

  // Serie mensual normalizada para el gráfico
  const maxIngreso = useMemo(() => {
    const max = Math.max(...data.serieMensual.map((m) => Math.max(m.ingresos, m.utilidadNeta)), 1000)
    return Math.ceil(max / 10000) * 10000 || 50000
  }, [data.serieMensual])

  // Distribución de Activos para el Gráfico de Dona
  const activos = useMemo(() => {
    const inv = data.capital.valorInventario
    const bank = data.capital.cuentasBancarias
    const cxc = data.capital.cuentasPorCobrar
    const total = inv + bank + cxc || 1

    return [
      { id: 'inv', label: 'Valor Inventario', valor: inv, pct: (inv / total) * 100, color: '#a855f7' }, // purple-500
      { id: 'bank', label: 'Cuentas Bancarias', valor: bank, pct: (bank / total) * 100, color: '#6366f1' }, // indigo-500
      { id: 'cxc', label: 'Cuentas por Cobrar', valor: cxc, pct: (cxc / total) * 100, color: '#38bdf8' }, // sky-400
    ]
  }, [data.capital])

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Filtros ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Utilidad y Pérdida
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Análisis financiero de ingresos, costos, margen neto y desglose de capital.
            </p>
          </div>
        </div>

        {/* Selectores de Período */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
            >
              <option value="todos">Mes actual (Agosto)</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 shadow-xs">
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value={2026}>Año actual (2026)</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 1: UTILIDAD ─────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Utilidad
        </h3>

        {/* 5 Tarjetas Bento de Rendimiento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Ingresos */}
          <Card className="card-interactive p-4 border-l-4 border-l-amber-500 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Ingresos</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +12.4%
              </span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground mt-2">
              {formatUsd(data.ingresos)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">vs. mes anterior</p>
          </Card>

          {/* Costos de pedidos */}
          <Card className="card-interactive p-4 border-l-4 border-l-rose-500 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Costos de pedidos</span>
              <span className="text-[10px] font-semibold text-rose-500 flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-0.5" /> -11.2%
              </span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground mt-2">
              -{formatUsd(data.costosPedidos)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">vs. mes anterior</p>
          </Card>

          {/* Utilidad Bruta */}
          <Card className="card-interactive p-4 border-l-4 border-l-indigo-500 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Utilidad Bruta</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +20.4%
              </span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground mt-2">
              {formatUsd(data.utilidadBruta)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">vs. mes anterior</p>
          </Card>

          {/* Gastos fijos/variables */}
          <Card className="card-interactive p-4 border-l-4 border-l-orange-500 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium truncate">Gastos Fijos/Var.</span>
              <span className="text-[10px] font-mono text-muted-foreground">0.0%</span>
            </div>
            <p className="font-mono text-xl font-bold text-foreground mt-2">
              {formatUsd(data.gastosFijosVariables)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">Gastos del período</p>
          </Card>

          {/* Utilidad Neta */}
          <Card className="card-interactive p-4 border-l-4 border-l-purple-500 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Utilidad Neta</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +18.4%
              </span>
            </div>
            <p className="font-mono text-xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              {formatUsd(data.utilidadNeta)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Margen: {data.margenNetoPct}%</p>
          </Card>
        </div>

        {/* Gráfico Mensual de Barras (Ingresos vs Utilidad Neta) */}
        <Card className="p-6 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <Badge variant="outline" className="font-semibold text-xs px-3 py-1">
              Año {anioSeleccionado}
            </Badge>

            {/* Leyenda */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground font-medium">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span className="text-muted-foreground font-medium">Utilidad Neta</span>
              </div>
            </div>
          </div>

          {/* Contenedor del Gráfico SVG Responsivo */}
          <div className="relative h-64 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240" preserveAspectRatio="none">
              {/* Líneas de Guía Horizontales */}
              <line x1="40" y1="20" x2="980" y2="20" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
              <line x1="40" y1="75" x2="980" y2="75" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
              <line x1="40" y1="130" x2="980" y2="130" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
              <line x1="40" y1="185" x2="980" y2="185" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
              <line x1="40" y1="210" x2="980" y2="210" stroke="currentColor" strokeOpacity="0.2" />

              {/* Etiquetas Eje Y */}
              <text x="30" y="25" textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">$50K</text>
              <text x="30" y="80" textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">$35K</text>
              <text x="30" y="135" textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">$20K</text>
              <text x="30" y="190" textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">$5K</text>
              <text x="30" y="214" textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">$0K</text>

              {/* Barras de los 12 meses */}
              {data.serieMensual.map((item, index) => {
                const groupWidth = 72
                const startX = 60 + index * groupWidth
                const barWidth = 14

                const altIngreso = Math.max(4, (item.ingresos / maxIngreso) * 180)
                const yIngreso = 210 - altIngreso

                const altUtilidad = Math.max(4, (item.utilidadNeta / maxIngreso) * 180)
                const yUtilidad = 210 - altUtilidad

                const isHovered = hoveredBar === index

                return (
                  <g
                    key={item.mes}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Fondo hover sutil */}
                    {isHovered && (
                      <rect
                        x={startX - 10}
                        y="10"
                        width={groupWidth - 8}
                        height="200"
                        rx="8"
                        className="fill-muted/40 transition-opacity"
                      />
                    )}

                    {/* Barra Ingresos */}
                    <rect
                      x={startX}
                      y={yIngreso}
                      width={barWidth}
                      height={altIngreso}
                      rx="3"
                      fill="#f59e0b"
                      className="transition-all duration-300 hover:opacity-90"
                    />

                    {/* Barra Utilidad Neta */}
                    <rect
                      x={startX + barWidth + 4}
                      y={yUtilidad}
                      width={barWidth}
                      height={altUtilidad}
                      rx="3"
                      fill="#a855f7"
                      className="transition-all duration-300 hover:opacity-90"
                    />

                    {/* Etiqueta del Mes en Eje X */}
                    <text
                      x={startX + barWidth}
                      y="230"
                      textAnchor="middle"
                      className={cn(
                        'text-[10px] font-medium transition-colors',
                        isHovered ? 'fill-foreground font-bold' : 'fill-muted-foreground'
                      )}
                    >
                      {item.mes}
                    </text>
                  </g>
                )
              })}
            </svg>

            {/* Tooltip flotante interactivo */}
            {hoveredBar !== null && (
              <div
                className="absolute z-20 rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-xs text-xs pointer-events-none transition-all duration-150 animate-pop-in"
                style={{
                  left: `${Math.min(85, Math.max(10, (hoveredBar / 12) * 100 + 4))}%`,
                  top: '15%',
                }}
              >
                <p className="font-bold text-foreground mb-1.5 border-b border-border pb-1">
                  {data.serieMensual[hoveredBar].mes} {anioSeleccionado}
                </p>
                <div className="space-y-1 font-mono">
                  <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                    <span>Ingresos:</span>
                    <span className="font-bold">{formatUsd(data.serieMensual[hoveredBar].ingresos)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-purple-600 dark:text-purple-400">
                    <span>Utilidad Neta:</span>
                    <span className="font-bold">{formatUsd(data.serieMensual[hoveredBar].utilidadNeta)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── SECCIÓN 2: CAPITAL Y ACTIVOS ────────────────────── */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Capital
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Tarjeta Hero Destacada: TOTAL DE CAPITAL (Púrpura Vibrante) */}
          <div className="lg:col-span-4 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <span className="rounded-full bg-emerald-400/20 border border-emerald-300/30 px-3 py-1 text-xs font-bold text-emerald-200 flex items-center">
                +{data.capital.crecimientoPct}%
              </span>
            </div>

            <div className="mt-8">
              <p className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight">
                {formatUsd(data.capital.totalCapital)}
              </p>
              <p className="text-xs uppercase tracking-widest text-purple-200 font-semibold mt-2">
                Total de Capital
              </p>
            </div>

            <div className="mt-6 border-t border-white/15 pt-4 text-[11px] text-purple-200/80">
              Patrimonio neto consolidado: Inventario físico + Cuentas bancarias + Cuentas por cobrar.
            </div>
          </div>

          {/* 4 Tarjetas de Desglose de Capital */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Valor Inventario */}
            <Card className="card-interactive p-4 flex flex-col justify-between bg-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>VALOR INVENTARIO</span>
                <Boxes className="h-4 w-4 text-purple-500" />
              </div>
              <p className="font-mono text-xl font-bold text-foreground mt-3">
                {formatUsd(data.capital.valorInventario)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Stock físico valorizado</p>
            </Card>

            {/* Cuentas Bancarias */}
            <Card className="card-interactive p-4 flex flex-col justify-between bg-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>CUENTAS BANCARIAS</span>
                <Building2 className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="font-mono text-xl font-bold text-foreground mt-3">
                {formatUsd(data.capital.cuentasBancarias)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Saldo en caja y bancos</p>
            </Card>

            {/* Cuentas por Cobrar */}
            <Card className="card-interactive p-4 flex flex-col justify-between bg-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Cuentas por cobrar</span>
                <Receipt className="h-4 w-4 text-sky-500" />
              </div>
              <p className="font-mono text-xl font-bold text-foreground mt-3">
                {formatUsd(data.capital.cuentasPorCobrar)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Facturas con saldo pendiente</p>
            </Card>

            {/* Cuentas por Pagar */}
            <Card className="card-interactive p-4 flex flex-col justify-between bg-card">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>Cuentas por pagar</span>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-mono text-xl font-bold text-foreground mt-3">
                {formatUsd(data.capital.cuentasPorPagar)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Compromisos de gasto</p>
            </Card>
          </div>

          {/* Gráfico de Dona: VALOR DE ACTIVOS */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between shadow-xs">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Valor de Activos
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Distribución porcentual</p>
            </div>

            {/* Dona SVG */}
            <div className="relative my-4 flex items-center justify-center">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                {/* Fondo */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="14" />
                
                {/* Segmento 1: Cuentas Bancarias (~69%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="14"
                  strokeDasharray={`${activos[1].pct * 2.38} 238`}
                  strokeDashoffset="0"
                  className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('bank')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Segmento 2: Valor Inventario (~26%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="14"
                  strokeDasharray={`${activos[0].pct * 2.38} 238`}
                  strokeDashoffset={`-${activos[1].pct * 2.38}`}
                  className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('inv')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Segmento 3: Cuentas por Cobrar (~5%) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="14"
                  strokeDasharray={`${activos[2].pct * 2.38} 238`}
                  strokeDashoffset={`-${(activos[1].pct + activos[0].pct) * 2.38}`}
                  className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment('cxc')}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Centro de la dona */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">100%</span>
                <span className="text-xs font-bold text-foreground font-mono">Activos</span>
              </div>
            </div>

            {/* Leyenda de la Dona */}
            <div className="space-y-1.5 text-[11px]">
              {activos.map((act) => (
                <div
                  key={act.id}
                  className={cn(
                    'flex items-center justify-between p-1 rounded-lg transition-colors',
                    hoveredSegment === act.id && 'bg-muted/60'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: act.color }} />
                    <span className="text-muted-foreground">{act.label}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground">{act.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
