'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Plus,
  RotateCcw,
  Printer,
  Calendar as CalendarIcon,
  Search,
  Clock,
  Ban,
  ShieldAlert,
  X,
  FileText,
  ShoppingCart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import PrintableNota from '@/components/PrintableNota'
import {
  getNotas,
  getNotaCompleta,
  crearDevolucion,
  anularNotaCompleta,
  type Nota,
  type NotaCompleta,
  type DetalleNota,
  type Devolucion,
} from '@/lib/actions/notas'
import { formatUsd, formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

const estadoBadgeMap = {
  pagada: 'pagada' as const,
  parcial: 'parcial' as const,
  anulada: 'anulada' as const,
}

type NotaListada = Nota & { devoluciones: Devolucion[] }

function cantidadDevueltaDe(nota: NotaCompleta, detalle: DetalleNota): number {
  return (nota.devoluciones ?? []).reduce((acc, d) => {
    if (d.detalle_nota_id === detalle.id) return acc + d.cantidad_devuelta
    if (d.detalle_nota_id === null && d.producto_id === detalle.producto_id) {
      return acc + d.cantidad_devuelta
    }
    return acc
  }, 0)
}

function formatHora(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface PedidosClientProps {
  initialNotas: NotaListada[]
}

type FiltroFecha = 'todos' | 'hoy' | 'semana' | 'personalizado'

export default function PedidosClient({ initialNotas }: PedidosClientProps) {
  const [notas, setNotas] = useState<NotaListada[]>(initialNotas)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todos')
  const [fechaEspecifica, setFechaEspecifica] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin' || user?.rol === 'developer'

  // Detalle de Nota
  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null)
  const [notaCompleta, setNotaCompleta] = useState<NotaCompleta | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  // Devolución individual
  const [detalleDevolucion, setDetalleDevolucion] = useState<DetalleNota | null>(null)
  const [cantidadDevolver, setCantidadDevolver] = useState('1')
  const [motivoDevolucion, setMotivoDevolucion] = useState('Devolución de producto')
  const [devolviendo, setDevolviendo] = useState(false)
  const [devolucionOk, setDevolucionOk] = useState(false)
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null)

  // Anulación total de nota (Solo Admin)
  const [modalAnularAbierto, setModalAnularAbierto] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('Error en emisión / Solicitud de anulación')
  const [anulando, setAnulando] = useState(false)
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null)

  // Impresión
  const [mostrarImpresion, setMostrarImpresion] = useState(false)

  const cargarNotas = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getNotas()
    if (error) {
      setError(errorMessage(error))
    } else {
      setNotas(data ?? [])
    }
    setCargando(false)
  }, [])

  const abrirDetalle = useCallback(async (nota: { id: string }) => {
    setNotaSeleccionadaId(nota.id)
    setCargandoDetalle(true)
    setErrorDetalle(null)
    setNotaCompleta(null)

    const { data, error } = await getNotaCompleta(nota.id)
    if (error) {
      setErrorDetalle(errorMessage(error))
    } else {
      setNotaCompleta(data)
    }
    setCargandoDetalle(false)
  }, [])

  // Auto-abrir nota si viene en los query params (ej. desde el escáner QR de Configuración)
  useEffect(() => {
    const paramId = searchParams.get('notaId')
    const paramCorrelativo = searchParams.get('correlativo')

    if (!paramId && !paramCorrelativo) return

    const timer = setTimeout(() => {
      if (paramId) {
        abrirDetalle({ id: paramId })
      } else if (paramCorrelativo) {
        const match = notas.find(
          (n) => n.correlativo.toLowerCase() === paramCorrelativo.toLowerCase()
        )
        if (match) {
          abrirDetalle(match)
        }
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [searchParams, notas, abrirDetalle])

  const abrirDevolucion = (detalle: DetalleNota) => {
    setDetalleDevolucion(detalle)
    setCantidadDevolver('1')
    setMotivoDevolucion('Muestra devuelta por el cliente')
    setDevolucionOk(false)
    setErrorDevolucion(null)
  }

  const devueltosHist =
    detalleDevolucion && notaCompleta
      ? cantidadDevueltaDe(notaCompleta, detalleDevolucion)
      : 0
  const cantidadMaxima = detalleDevolucion ? detalleDevolucion.cantidad - devueltosHist : 0

  const confirmarDevolucion = async () => {
    if (!detalleDevolucion || !notaCompleta) return
    const cantNum = parseInt(cantidadDevolver, 10)
    if (isNaN(cantNum) || cantNum < 1 || cantNum > cantidadMaxima) {
      setErrorDevolucion(`Ingresa una cantidad válida entre 1 y ${cantidadMaxima}.`)
      return
    }

    setDevolviendo(true)
    setErrorDevolucion(null)

    const { error } = await crearDevolucion({
      nota_id: notaCompleta.id,
      producto_id: detalleDevolucion.producto_id,
      detalle_nota_id: detalleDevolucion.id,
      cantidad_devuelta: cantNum,
      monto_descontado: cantNum * detalleDevolucion.precio_unitario_usd,
      motivo: motivoDevolucion.trim() || 'Devolución de producto',
      usuario_id: user?.id || null,
      fecha: new Date().toISOString(),
    })

    setDevolviendo(false)
    if (error) {
      setErrorDevolucion(errorMessage(error))
      return
    }

    setDevolucionOk(true)
    setTimeout(() => {
      setDetalleDevolucion(null)
      if (notaSeleccionadaId) {
        abrirDetalle({ id: notaSeleccionadaId } as NotaListada)
      }
      cargarNotas()
    }, 1200)
  }

  const abrirModalAnular = () => {
    setMotivoAnulacion('Error en emisión / Solicitud de anulación')
    setErrorAnulacion(null)
    setModalAnularAbierto(true)
  }

  const confirmarAnularNota = async () => {
    if (!notaCompleta) return
    setAnulando(true)
    setErrorAnulacion(null)

    const { error } = await anularNotaCompleta(
      notaCompleta.id,
      motivoAnulacion,
      user?.id || undefined
    )

    setAnulando(false)
    if (error) {
      setErrorAnulacion(errorMessage(error))
      return
    }

    setModalAnularAbierto(false)
    setNotaSeleccionadaId(null)
    setNotaCompleta(null)
    cargarNotas()
  }

  // Filtrado reactivo en memoria
  const notasFiltradas = useMemo(() => {
    const ahora = new Date()
    const hoyStr = ahora.toISOString().split('T')[0]
    
    // Inicio de la semana (Lunes)
    const diaSemana = ahora.getDay()
    const diffLunes = ahora.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1)
    const lunes = new Date(ahora.setDate(diffLunes))
    lunes.setHours(0, 0, 0, 0)

    return notas.filter((nota) => {
      // 1. Filtro de búsqueda por texto
      const texto = busqueda.toLowerCase().trim()
      const coincideTexto =
        !texto ||
        nota.correlativo.toLowerCase().includes(texto) ||
        nota.cliente_nombre.toLowerCase().includes(texto)

      if (!coincideTexto) return false

      // 2. Filtro de fecha
      const fechaNota = new Date(nota.fecha_creacion)
      const fechaNotaStr = nota.fecha_creacion.split('T')[0]

      if (filtroFecha === 'hoy') {
        return fechaNotaStr === hoyStr
      }
      if (filtroFecha === 'semana') {
        return fechaNota >= lunes
      }
      if (filtroFecha === 'personalizado' && fechaEspecifica) {
        return fechaNotaStr === fechaEspecifica
      }

      return true
    })
  }, [notas, busqueda, filtroFecha, fechaEspecifica])

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Acciones ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Pedidos y Ventas
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Listado e historial de ventas directas realizadas, devoluciones y auditoría.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={cargarNotas}
            disabled={cargando}
            className="h-10 px-3.5 rounded-xl text-xs font-semibold"
          >
            <RotateCcw className={cn('mr-1.5 h-3.5 w-3.5', cargando && 'animate-spin')} />
            Actualizar
          </Button>
          <Link href="/vender">
            <Button variant="primary" size="md" className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Venta
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* ─── Barra de Filtros y Búsqueda (h-10 homogénea) ─── */}
      <Card className="p-3.5 md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por correlativo (#00001) o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-9 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20 transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros de Fecha Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setFiltroFecha('todos')
                  setFechaEspecifica('')
                }}
                className={cn(
                  'h-full rounded-lg px-3 text-xs font-medium transition-all',
                  filtroFecha === 'todos'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroFecha('hoy')
                  setFechaEspecifica('')
                }}
                className={cn(
                  'h-full rounded-lg px-3 text-xs font-medium transition-all',
                  filtroFecha === 'hoy'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  setFiltroFecha('semana')
                  setFechaEspecifica('')
                }}
                className={cn(
                  'h-full rounded-lg px-3 text-xs font-medium transition-all',
                  filtroFecha === 'semana'
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Esta Semana
              </button>
            </div>

            {/* Selector de Fecha Específica (Mini Calendario) */}
            <div className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={fechaEspecifica}
                onChange={(e) => {
                  setFechaEspecifica(e.target.value)
                  setFiltroFecha(e.target.value ? 'personalizado' : 'todos')
                }}
                className="bg-transparent text-xs text-foreground font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Tabla de Pedidos ─── */}
      <Card className="overflow-hidden">
        {cargando && notas.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted-foreground/20 border-t-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Correlativo</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha y Hora</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Subtotal</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {notasFiltradas.map((nota) => (
                  <tr
                    key={nota.id}
                    onClick={() => abrirDetalle(nota)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                      <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          {nota.correlativo}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground truncate max-w-[200px]">
                        {nota.cliente_nombre}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={estadoBadgeMap[nota.estado]}>{nota.estado}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span className="font-mono text-xs text-foreground font-medium">
                            {formatHora(nota.fecha_creacion)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {formatDate(nota.fecha_creacion)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono tracking-tight text-muted-foreground text-right">
                        {formatUsd(nota.subtotal_usd)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold tracking-tight text-foreground text-right">
                        {formatUsd(nota.total_usd)}
                      </td>
                    </tr>
                  ))}
                  {notasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        {busqueda || filtroFecha !== 'todos'
                          ? 'No se encontraron pedidos con los filtros aplicados.'
                          : 'Aún no hay notas emitidas. Crea la primera en /vender.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      {/* Drawer detalle de nota */}
      <Drawer
        open={Boolean(notaSeleccionadaId)}
        onClose={() => setNotaSeleccionadaId(null)}
        title={notaCompleta ? `Nota ${notaCompleta.correlativo}` : 'Detalle de Nota'}
      >
        {cargandoDetalle ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
          </div>
        ) : errorDetalle ? (
          <ErrorMessage message={errorDetalle} />
        ) : (
          notaCompleta && (
            <div className="space-y-5">
              {/* Tarjeta Resumen */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cliente</p>
                    <p className="font-bold text-foreground text-base mt-0.5">{notaCompleta.cliente_nombre}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatHora(notaCompleta.fecha_creacion)} · {formatDate(notaCompleta.fecha_creacion)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setMostrarImpresion(true)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </Button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <Badge variant={estadoBadgeMap[notaCompleta.estado]}>
                    {notaCompleta.estado}
                  </Badge>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total a Pagar</p>
                    <span className="font-mono text-base font-bold text-foreground">{formatUsd(notaCompleta.total_usd)}</span>
                  </div>
                </div>
              </div>

              {/* Lista de Productos */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Productos en esta Nota
                </p>
                {notaCompleta.detalles_nota.map((detalle) => {
                  const devuelto = cantidadDevueltaDe(notaCompleta, detalle)
                  const disponible = detalle.cantidad - devuelto
                  return (
                    <div
                      key={detalle.id}
                      className="rounded-xl border border-border bg-card p-4 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {detalle.productos?.nombre ?? 'Producto'}
                          </p>
                          <span className="mt-1 inline-block rounded-lg bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {detalle.productos?.codigo_sku ?? 'S/N'}
                          </span>
                          <p className="mt-2 font-mono text-xs text-muted-foreground">
                            {detalle.cantidad} uds. × {formatUsd(detalle.precio_unitario_usd)}
                            {devuelto > 0 && (
                              <span className="ml-2 text-rose-500 font-medium">
                                (−{devuelto} devueltas)
                              </span>
                            )}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-foreground">{formatUsd(detalle.subtotal_usd)}</p>
                      </div>
                      {disponible > 0 && notaCompleta.estado !== 'anulada' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3 w-full text-xs"
                          onClick={() => abrirDevolucion(detalle)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Devolver Parcialmente ({disponible} disponibles)
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Sección de Anulación Exclusiva para Administrador / Jefe */}
              {notaCompleta.estado !== 'anulada' && (
                <div className="mt-6 border-t border-border pt-4">
                  {esAdmin ? (
                    <Button
                      variant="danger"
                      className="w-full justify-center"
                      onClick={abrirModalAnular}
                    >
                      <Ban className="h-4 w-4 mr-1.5" />
                      Anular Pedido y Revertir Inventario
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Solo el rol <strong>Jefe / Administrador</strong> puede anular pedidos ya emitidos.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </Drawer>

      {/* Modal Devolución Parcial */}
      <Modal
        open={Boolean(detalleDevolucion)}
        onClose={() => setDetalleDevolucion(null)}
        title="Devolver Producto al Inventario"
      >
        {detalleDevolucion && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {notaCompleta?.detalles_nota.find((d) => d.id === detalleDevolucion.id)
                ?.productos?.nombre ?? 'Producto'}{' '}
              — máximo{' '}
              <span className="font-mono font-semibold text-foreground">{cantidadMaxima}</span> uds.
            </p>
            <div>
              <label htmlFor="cant-devolver" className="mb-1.5 block text-sm font-medium">
                Cantidad a devolver
              </label>
              <input
                id="cant-devolver"
                type="text"
                inputMode="numeric"
                value={cantidadDevolver}
                onChange={(e) => setCantidadDevolver(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 font-mono text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </div>
            <div>
              <label htmlFor="motivo-devolucion" className="mb-1.5 block text-sm font-medium">
                Motivo
              </label>
              <input
                id="motivo-devolucion"
                type="text"
                value={motivoDevolucion}
                onChange={(e) => setMotivoDevolucion(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Monto a descontar de la nota:{' '}
              <span className="font-mono font-bold text-foreground">
                {formatUsd((parseInt(cantidadDevolver, 10) || 0) * detalleDevolucion.precio_unitario_usd)}
              </span>
            </p>
            {errorDevolucion && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900">
                {errorDevolucion}
              </div>
            )}
            <Button
              variant="primary"
              className="w-full"
              disabled={
                devolviendo ||
                parseInt(cantidadDevolver, 10) < 1 ||
                parseInt(cantidadDevolver, 10) > cantidadMaxima
              }
              onClick={confirmarDevolucion}
            >
              {devolviendo
                ? 'Registrando reingreso...'
                : devolucionOk
                  ? 'Devolución procesada ✓'
                  : 'Confirmar Reingreso al Inventario'}
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal Confirmar Anulación Total */}
      <Modal
        open={modalAnularAbierto}
        onClose={() => setModalAnularAbierto(false)}
        title="Anular Pedido Completo"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-sm text-foreground">
            <p className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              Acción destructiva de Administrador
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Esta acción reingresará <strong>todas las unidades físicas</strong> de los libros al
              Libro Mayor de inventario y marcará el saldo de la nota en <strong>$0.00</strong> (anulada).
            </p>
          </div>

          <div>
            <label htmlFor="motivo-anulacion" className="mb-1.5 block text-sm font-medium">
              Motivo de la anulación
            </label>
            <input
              id="motivo-anulacion"
              type="text"
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
            />
          </div>

          {errorAnulacion && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900">
              {errorAnulacion}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setModalAnularAbierto(false)}
              disabled={anulando}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={confirmarAnularNota}
              disabled={anulando}
            >
              {anulando ? 'Anulando...' : 'Confirmar Anulación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Vista de Impresión de la Nota */}
      {mostrarImpresion && notaCompleta && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <PrintableNota
            nota={{
              id: notaCompleta.id,
              correlativo: notaCompleta.correlativo,
              fecha: formatDate(notaCompleta.fecha_creacion),
              observaciones:
                notaCompleta.estado === 'anulada'
                  ? 'NOTA ANULADA'
                  : notaCompleta.estado_flotante === 'abierta'
                    ? 'Nota en consignación / entrega pendiente'
                    : 'Venta cancelada en su totalidad',
              tipoSalida: notaCompleta.tipo_salida,
            }}
            cliente={{
              nombre: notaCompleta.cliente_nombre,
              rif: 'J-50410440-0',
              direccion: 'Caracas, Venezuela',
            }}
            items={notaCompleta.detalles_nota.map((det) => ({
              cantidad: det.cantidad,
              descripcion: det.productos?.nombre || 'Producto',
              sku: det.productos?.codigo_sku || 'S/N',
              precioUsd: det.precio_unitario_usd,
              totalUsd: det.subtotal_usd,
            }))}
            onClose={() => setMostrarImpresion(false)}
          />
        </div>
      )}
    </div>
  )
}
