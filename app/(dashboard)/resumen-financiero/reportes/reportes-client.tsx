'use client'

/**
 * app/(dashboard)/resumen-financiero/reportes/reportes-client.tsx
 * -------------------------------------------------------
 * Vista de Reportes Diarios y Detallados.
 * Reproduce fielmente el módulo de reportes financieros:
 * 1. Filtros por rango de fecha/hora y usuario.
 * 2. 4 Pestañas: Pedidos, Cuentas, Métodos de pago, Inventario.
 * 3. 6 Tarjetas Bento de KPIs resumen del período.
 * 4. Tabla detallada con paginación y exportación a CSV/Excel.
 * -------------------------------------------------------
 */

import { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Download,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { formatUsd, formatDate } from '@/lib/format'
import type { ReporteFinancieroData } from '@/lib/actions/resumen-financiero'

interface ReportesClientProps {
  initialData: ReporteFinancieroData
}

export default function ReportesClient({ initialData }: ReportesClientProps) {
  const [data] = useState<ReporteFinancieroData>(initialData)
  const [activeTab, setActiveTab] = useState('pedidos')
  
  // Filtros de fecha y hora
  const [fechaInicio, setFechaInicio] = useState('2026-08-01T00:00')
  const [fechaFin, setFechaFin] = useState('2026-08-15T23:59')
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const itemsPorPagina = 15

  const tabsConfig = [
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'cuentas', label: 'Cuentas' },
    { id: 'metodos', label: 'Métodos de pago' },
    { id: 'inventario', label: 'Inventario' },
  ]

  // Filtrado de pedidos
  const pedidosFiltrados = useMemo(() => {
    return data.pedidos.filter((p) => {
      const q = busqueda.toLowerCase().trim()
      const matchBusqueda =
        !q ||
        p.correlativo.toLowerCase().includes(q) ||
        p.cliente.toLowerCase().includes(q) ||
        p.canal.toLowerCase().includes(q)

      return matchBusqueda
    })
  }, [data.pedidos, busqueda])

  const totalPaginas = Math.ceil(pedidosFiltrados.length / itemsPorPagina) || 1
  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina
    return pedidosFiltrados.slice(inicio, inicio + itemsPorPagina)
  }, [pedidosFiltrados, paginaActual, itemsPorPagina])

  // Exportar a CSV
  const exportarCSV = () => {
    const headers = [
      'Orden',
      'Cliente',
      'Canal de pedido',
      'Fecha',
      'Creado por',
      'Metodo de pago',
      'Costo de pedido USD',
      'Facturacion USD',
      'Total cobrado USD',
    ]

    const rows = pedidosFiltrados.map((p) => [
      p.correlativo,
      `"${p.cliente}"`,
      p.canal,
      formatDate(p.fecha),
      p.creadoPor,
      p.metodoPago,
      p.costoPedido.toFixed(2),
      p.facturacion.toFixed(2),
      p.totalCobrado.toFixed(2),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `reporte_financiero_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Reportes Financieros
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Auditoría detallada de órdenes, canales de venta, métodos de pago y desglose contable.
          </p>
        </div>
      </div>

      {/* Barra de Filtros de Reporte */}
      <Card className="p-5 bg-card">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Fecha y hora inicial */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Fecha y hora inicial:
              </label>
              <input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-foreground focus:border-primary-accent focus:outline-none"
              />
            </div>

            {/* Fecha y hora final */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Fecha y hora final:
              </label>
              <input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-foreground focus:border-primary-accent focus:outline-none"
              />
            </div>

            {/* Selector de Usuario */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Usuarios:
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={usuarioSeleccionado}
                  onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="todos">Todos los usuarios</option>
                  <option value="maria">María Pérez (Secretaria)</option>
                  <option value="admin">Administrador (Jefe)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" className="gap-1.5">
              Generar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFechaInicio('2026-01-01T00:00')
                setFechaFin('2026-12-31T23:59')
              }}
            >
              Reporte completo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 text-indigo-600 dark:text-indigo-400"
              onClick={exportarCSV}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar reporte
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs Principales */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

        {/* Buscador Rápido en la Tabla */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar en el reporte..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPaginaActual(1)
            }}
            className="w-full rounded-xl border border-border bg-muted/30 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
          />
        </div>
      </div>

      {/* 6 Tarjetas Resumen de KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Órdenes</span>
          <p className="font-mono text-lg font-bold text-foreground mt-1">{data.kpis.totalOrdenes}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ingresos</span>
          <p className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatUsd(data.kpis.ingresos)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate block">Costos de pedidos</span>
          <p className="font-mono text-lg font-bold text-rose-500 mt-1">
            -{formatUsd(data.kpis.costosPedidos)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider truncate block">Gastos Fijos/Var.</span>
          <p className="font-mono text-lg font-bold text-foreground mt-1">
            {formatUsd(data.kpis.gastosFijosVariables)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Utilidad Bruta</span>
          <p className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {formatUsd(data.kpis.utilidadBruta)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Utilidad Neta</span>
          <p className="font-mono text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatUsd(data.kpis.utilidadNeta)}
          </p>
        </div>
      </div>

      {/* ── TAB 1: REPORTE DE PEDIDOS ───────────────────────── */}
      {activeTab === 'pedidos' && (
        <Card className="overflow-hidden bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground">Reporte de pedidos</h3>
            <span className="text-xs text-muted-foreground font-mono">
              Total: {pedidosFiltrados.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Canal de pedido</th>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Creado por</th>
                  <th className="px-4 py-3">Métodos de pago</th>
                  <th className="px-4 py-3 text-right">Costo de pedido</th>
                  <th className="px-4 py-3 text-right">Facturación</th>
                  <th className="px-4 py-3 text-right">Total cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pedidosPaginados.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-primary-accent">
                      {item.correlativo}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">
                      {item.cliente}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.canal}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(item.fecha).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.creadoPor}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                        {item.metodoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatUsd(item.costoPedido)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                      {formatUsd(item.facturacion)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatUsd(item.totalCobrado)}
                    </td>
                  </tr>
                ))}
                {pedidosPaginados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No se encontraron registros de pedidos en este rango de fechas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Mostrando {Math.min((paginaActual - 1) * itemsPorPagina + 1, pedidosFiltrados.length)} -{' '}
              {Math.min(paginaActual * itemsPorPagina, pedidosFiltrados.length)} de {pedidosFiltrados.length} resultados
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono px-2 font-semibold text-foreground">
                {paginaActual} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB 2: CUENTAS ──────────────────────────────────── */}
      {activeTab === 'cuentas' && (
        <Card className="p-6 bg-card text-center space-y-4">
          <h3 className="font-bold text-base text-foreground">Resumen de Cuentas por Cobrar y Pagar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Cuentas por cobrar</span>
              <p className="font-mono text-2xl font-bold text-sky-500 mt-2">$6,993.00</p>
              <p className="text-xs text-muted-foreground mt-1">Saldo pendiente de cobro</p>
            </div>
            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Cuentas por pagar</span>
              <p className="font-mono text-2xl font-bold text-foreground mt-2">$0.00</p>
              <p className="text-xs text-muted-foreground mt-1">Obligaciones pendientes</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB 3: MÉTODOS DE PAGO ──────────────────────────── */}
      {activeTab === 'metodos' && (
        <Card className="p-6 bg-card space-y-4">
          <h3 className="font-bold text-base text-foreground">Desglose por Métodos de Pago</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border p-4 bg-emerald-500/5">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Dólares Efectivo / Zelle</span>
              <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">$38,450.00</p>
              <p className="text-xs text-muted-foreground mt-1">85.5% del total cobrado</p>
            </div>
            <div className="rounded-2xl border border-border p-4 bg-indigo-500/5">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Transferencia / Pago Móvil</span>
              <p className="font-mono text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">$6,522.00</p>
              <p className="text-xs text-muted-foreground mt-1">14.5% del total cobrado</p>
            </div>
            <div className="rounded-2xl border border-border p-4 bg-amber-500/5">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Euros</span>
              <p className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">€0.00</p>
              <p className="text-xs text-muted-foreground mt-1">0.0% del total cobrado</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB 4: INVENTARIO ───────────────────────────────── */}
      {activeTab === 'inventario' && (
        <Card className="p-6 bg-card text-center space-y-4">
          <h3 className="font-bold text-base text-foreground">Valorización y Rotación de Inventario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Valor Físico en Libros</span>
              <p className="font-mono text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">$39,639.40</p>
              <p className="text-xs text-muted-foreground mt-1">Calculado en base a stock activo</p>
            </div>
            <div className="rounded-2xl border border-border p-4 bg-muted/20">
              <span className="text-xs text-muted-foreground font-semibold uppercase">Unidades Despachadas</span>
              <p className="font-mono text-2xl font-bold text-foreground mt-2">1,420 uds.</p>
              <p className="text-xs text-muted-foreground mt-1">En el rango seleccionado</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
