'use client'

/**
 * app/(dashboard)/promociones/page.tsx
 * -------------------------------------------------------
 * Zona de Promociones (Muestras Escolares / Productos Prestados).
 * 
 * Concepto:
 * Se entregan libros a colegios/docentes para que evalúen
 * las listas escolares.
 * - Salida del inventario físico (descuenta stock).
 * - NO cuenta como ingreso financiero aún (estado flotante).
 * - Permite devoluciones indefinidas/parciales en cualquier
 *   momento (reingresan al stock inmediatamente).
 * - Permite liquidar la promoción cuando el colegio aprueba
 *   o decide quedarse con los libros restantes (se vuelve venta real).
 * -------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  RotateCcw,
  CheckCircle2,
  Plus,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getNotas,
  getNotaCompleta,
  crearDevolucion,
  liquidarPromocion,
  eliminarNota,
  type Nota,
  type NotaCompleta,
  type DetalleNota,
  type Devolucion,
} from '@/lib/actions/notas'
import { formatUsd, formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

type NotaListada = Nota & { devoluciones: Devolucion[] }

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<NotaListada[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'abiertas' | 'cerradas'>('abiertas')
  const [busqueda, setBusqueda] = useState('')

  // Drawer de detalle
  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null)
  const [notaCompleta, setNotaCompleta] = useState<NotaCompleta | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  // Modal de devolución individual
  const [detalleDevolucion, setDetalleDevolucion] = useState<DetalleNota | null>(null)
  const [cantidadDevolver, setCantidadDevolver] = useState('1')
  const [motivoDevolucion, setMotivoDevolucion] = useState('No seleccionado en lista escolar')
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false)
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null)

  // Liquidación
  const [liquidando, setLiquidando] = useState(false)

  // Auth RBAC
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'

  const cargarPromociones = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getNotas('promocion')
    if (error) {
      setError(errorMessage(error))
    } else {
      setPromociones((data as NotaListada[]) ?? [])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPromociones()
  }, [cargarPromociones])

  const abrirDetalle = async (nota: NotaListada) => {
    setNotaSeleccionadaId(nota.id)
    setCargandoDetalle(true)
    setErrorDetalle(null)

    const { data, error } = await getNotaCompleta(nota.id)
    setCargandoDetalle(false)

    if (error) {
      setErrorDetalle(errorMessage(error))
    } else {
      setNotaCompleta(data)
    }
  }

  const cerrarDrawer = () => {
    setNotaSeleccionadaId(null)
    setNotaCompleta(null)
    setDetalleDevolucion(null)
  }

  // Devolución individual
  const abrirModalDevolucion = (detalle: DetalleNota) => {
    setDetalleDevolucion(detalle)
    setCantidadDevolver('1')
    setMotivoDevolucion('Muestra devuelta por el colegio')
    setErrorDevolucion(null)
  }

  const handleConfirmarDevolucion = async () => {
    if (!detalleDevolucion || !notaCompleta) return

    const cantNum = parseInt(cantidadDevolver, 10)
    const maxDevolver = detalleDevolucion.cantidad - getDevueltosDeDetalle(detalleDevolucion.id)

    if (isNaN(cantNum) || cantNum <= 0 || cantNum > maxDevolver) {
      setErrorDevolucion(`Ingresa una cantidad válida entre 1 y ${maxDevolver}.`)
      return
    }

    setProcesandoDevolucion(true)
    setErrorDevolucion(null)

    const { error } = await crearDevolucion({
      nota_id: notaCompleta.id,
      producto_id: detalleDevolucion.producto_id,
      detalle_nota_id: detalleDevolucion.id,
      cantidad_devuelta: cantNum,
      monto_descontado: cantNum * detalleDevolucion.precio_unitario_usd,
      motivo: motivoDevolucion,
      usuario_id: user?.id ?? null,
      fecha: new Date().toISOString(),
    })

    setProcesandoDevolucion(false)

    if (error) {
      setErrorDevolucion(errorMessage(error))
      return
    }

    setDetalleDevolucion(null)
    // Recargar datos
    if (notaSeleccionadaId) {
      abrirDetalle({ id: notaSeleccionadaId } as NotaListada)
    }
    cargarPromociones()
  }

  // Liquidar promoción (convierte lo restante en venta real)
  const handleLiquidarPromocion = async (notaId: string) => {
    if (!confirm('¿Deseas liquidar esta promoción? Los libros que no han sido devueltos se registrarán como venta definitiva e ingresarán al saldo.')) return

    setLiquidando(true)
    const { error } = await liquidarPromocion(notaId)
    setLiquidando(false)

    if (error) {
      alert(errorMessage(error))
      return
    }

    cerrarDrawer()
    cargarPromociones()
  }

  const handleEliminarNota = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de promoción?')) return

    const { error } = await eliminarNota(id)
    if (error) {
      alert(errorMessage(error))
      return
    }

    cerrarDrawer()
    cargarPromociones()
  }

  // Cantidad devuelta acumulada
  const getDevueltosDeDetalle = (detalleId: string) => {
    if (!notaCompleta) return 0
    return notaCompleta.devoluciones
      .filter((d) => d.detalle_nota_id === detalleId)
      .reduce((acc, d) => acc + d.cantidad_devuelta, 0)
  }

  // Filtrado de promociones
  const promocionesFiltradas = promociones.filter((p) => {
    const coincideTexto =
      p.correlativo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())

    if (!coincideTexto) return false

    if (filtroEstado === 'abiertas') return p.estado_flotante === 'abierta'
    if (filtroEstado === 'cerradas') return p.estado_flotante === 'cerrada'
    return true
  })

  // Métricas
  const totalAbiertas = promociones.filter((p) => p.estado_flotante === 'abierta').length
  const totalCerradas = promociones.filter((p) => p.estado_flotante === 'cerrada').length
  const valorFlotante = promociones
    .filter((p) => p.estado_flotante === 'abierta')
    .reduce((acc, p) => acc + p.total_usd, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Promociones & Muestras</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Libros prestados a colegios y docentes para evaluación de listas escolares. Salidas flotantes con devoluciones continuas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/vender">
            <Button variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Promoción
            </Button>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Promociones en Curso</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-foreground">{totalAbiertas}</span>
              <Badge variant="warning">Muestras activas</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Libros en evaluación en colegios</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor en Muestras</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-foreground">{formatUsd(valorFlotante)}</span>
              <span className="font-mono text-xs text-muted-foreground">Flotante</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">No ingresa a saldo hasta liquidar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Promociones Liquidadas</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-foreground">{totalCerradas}</span>
              <Badge variant="pagada">Cerradas</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Aprobadas y convertidas a venta</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setFiltroEstado('abiertas')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              filtroEstado === 'abiertas'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            En Curso ({totalAbiertas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('cerradas')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              filtroEstado === 'cerradas'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Liquidadas / Cerradas ({totalCerradas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('todas')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              filtroEstado === 'todas'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todas ({promociones.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por colegio o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-xs focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
          />
        </div>
      </div>

      {/* Tabla de Promociones */}
      {error && <ErrorMessage message={error} />}

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : promocionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No hay notas de promoción en esta categoría.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Puedes emitir una entrega de muestras seleccionando &quot;Promoción&quot; al vender.
            </p>
            <Link href="/vender" className="mt-4">
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Crear Entrega de Muestra
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Nota / Código</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Colegio / Cliente</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Monto Flotante</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Fecha de Entrega</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {promocionesFiltradas.map((promo) => (
                    <tr
                      key={promo.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {promo.correlativo}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {promo.cliente_nombre}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={promo.estado_flotante === 'abierta' ? 'warning' : 'pagada'}>
                          {promo.estado_flotante === 'abierta' ? 'En Evaluación' : 'Liquidada'}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 font-mono sm:table-cell">
                        {formatUsd(promo.total_usd)}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                        {formatDate(promo.fecha_creacion)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDetalle(promo)}
                          className="h-8 gap-1 text-xs"
                        >
                          Ver Muestras
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drawer de Detalle de Promoción */}
      <Drawer
        open={Boolean(notaSeleccionadaId)}
        onClose={cerrarDrawer}
        title={notaCompleta ? `Muestras — Nota ${notaCompleta.correlativo}` : 'Cargando...'}
        size="md"
      >
        {cargandoDetalle ? (
          <div className="space-y-3 p-4">
            <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-32 animate-pulse rounded-xl bg-muted/60" />
          </div>
        ) : errorDetalle ? (
          <ErrorMessage message={errorDetalle} />
        ) : notaCompleta ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-1">
              {/* Resumen del Colegio */}
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Colegio / Receptor</span>
                    <p className="font-semibold text-sm text-foreground">{notaCompleta.cliente_nombre}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Entrega</span>
                    <p className="font-medium text-foreground">{formatDate(notaCompleta.fecha_creacion)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado Actual</span>
                    <div className="mt-0.5">
                      <Badge variant={notaCompleta.estado_flotante === 'abierta' ? 'warning' : 'pagada'}>
                        {notaCompleta.estado_flotante === 'abierta' ? 'En Muestra (Flotante)' : 'Liquidada (Venta Cerrada)'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monto Pendiente</span>
                    <p className="font-mono font-bold text-base text-foreground">{formatUsd(notaCompleta.total_usd)}</p>
                  </div>
                </div>
              </div>

              {/* Lista de Libros Prestados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Libros en Evaluación
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {notaCompleta.detalles_nota.length} títulos
                  </span>
                </div>

                {notaCompleta.detalles_nota.map((det) => {
                  const devueltos = getDevueltosDeDetalle(det.id)
                  const activos = det.cantidad - devueltos

                  return (
                    <div
                      key={det.id}
                      className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-foreground">{det.productos?.nombre ?? 'Libro'}</p>
                          <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {det.productos?.codigo_sku ?? 'S/N'}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-semibold">
                          {formatUsd(det.precio_unitario_usd * activos)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Entregados: <strong className="font-mono text-foreground">{det.cantidad}</strong>
                          </span>
                          {devueltos > 0 && (
                            <span className="text-rose-500 font-medium">
                              (Devueltos: {devueltos})
                            </span>
                          )}
                          <span className="text-emerald-600 font-medium">
                            Activos: {activos}
                          </span>
                        </div>

                        {/* Botón Devolución para esta muestra si aún está abierta */}
                        {notaCompleta.estado_flotante === 'abierta' && activos > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalDevolucion(det)}
                            className="h-7 px-2.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Devolver Libro
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Historial de Devoluciones registradas */}
              {notaCompleta.devoluciones.length > 0 && (
                <div className="space-y-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Historial de Devoluciones de Muestra:
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {notaCompleta.devoluciones.map((dev) => (
                      <li key={dev.id} className="flex items-center justify-between">
                        <span>
                          {dev.cantidad_devuelta} uds. — <span className="italic">{dev.motivo || 'Devolución de muestra'}</span>
                        </span>
                        <span className="font-mono text-rose-600">
                          −{formatUsd(dev.monto_descontado)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Acciones del Drawer */}
            <div className="mt-4 border-t border-border pt-4 space-y-2 shrink-0">
              {notaCompleta.estado_flotante === 'abierta' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleLiquidarPromocion(notaCompleta.id)}
                  disabled={liquidando}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {liquidando ? 'Liquidando...' : 'Liquidar / Facturar Libros Aprobados'}
                </Button>
              )}

              {esAdmin && (
                <Button
                  variant="ghost"
                  className="w-full text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={() => handleEliminarNota(notaCompleta.id)}
                >
                  Anular Registro de Promoción
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Modal Devolver Libro de Muestra */}
      <Modal
        open={Boolean(detalleDevolucion)}
        onClose={() => setDetalleDevolucion(null)}
        title="Devolver Libro al Inventario"
      >
        {detalleDevolucion && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registra los libros de muestra no aprobados por el colegio para que reingresen inmediatamente a tu inventario activo.
            </p>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground">Producto:</span>
              <p className="font-semibold text-foreground text-sm">
                {notaCompleta?.detalles_nota.find((d) => d.id === detalleDevolucion.id)?.productos?.nombre ?? 'Libro'}
              </p>
              <p className="mt-1 text-muted-foreground">
                Disponibles para devolver:{' '}
                <strong className="text-foreground font-mono">
                  {detalleDevolucion.cantidad - getDevueltosDeDetalle(detalleDevolucion.id)} uds.
                </strong>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Cantidad a devolver al inventario
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cantidadDevolver}
                onChange={(e) => setCantidadDevolver(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Motivo / Observación
              </label>
              <input
                type="text"
                value={motivoDevolucion}
                onChange={(e) => setMotivoDevolucion(e.target.value)}
                placeholder="Ej: No seleccionado por la docente"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </div>

            {errorDevolucion && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                {errorDevolucion}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDetalleDevolucion(null)} disabled={procesandoDevolucion}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleConfirmarDevolucion} disabled={procesandoDevolucion}>
                {procesandoDevolucion ? 'Procesando...' : 'Reingresar al Inventario'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
