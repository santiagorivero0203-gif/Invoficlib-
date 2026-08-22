'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  GraduationCap,
  RotateCcw,
  Plus,
  Search,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Package,
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
  cerrarPromocion,
  eliminarNota,
  type Nota,
  type NotaCompleta,
  type DetalleNota,
  type Devolucion,
} from '@/lib/actions/notas'
import { formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

type NotaListada = Nota & { devoluciones: Devolucion[] }

interface PromocionesClientProps {
  initialPromociones: NotaListada[]
}

export default function PromocionesClient({ initialPromociones }: PromocionesClientProps) {
  const [promociones, setPromociones] = useState<NotaListada[]>(initialPromociones)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'abiertas' | 'cerradas'>('abiertas')
  const [busqueda, setBusqueda] = useState('')

  // Drawer de detalle
  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null)
  const [notaCompleta, setNotaCompleta] = useState<NotaCompleta | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  // Modal de devolución individual por libro
  const [detalleDevolucion, setDetalleDevolucion] = useState<DetalleNota | null>(null)
  const [cantidadDevolver, setCantidadDevolver] = useState('1')
  const [motivoDevolucion, setMotivoDevolucion] = useState('Muestra no adoptada en lista escolar')
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false)
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null)

  // Finalizar promoción
  const [cerrando, setCerrando] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin' || user?.rol === 'developer'

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

  const abrirModalDevolucion = (detalle: DetalleNota) => {
    setDetalleDevolucion(detalle)
    setCantidadDevolver('1')
    setMotivoDevolucion('Muestra no seleccionada por el colegio')
    setErrorDevolucion(null)
  }

  const getDevueltosDeDetalle = (detalleId: string) => {
    if (!notaCompleta) return 0
    return notaCompleta.devoluciones
      .filter((d) => d.detalle_nota_id === detalleId)
      .reduce((acc, d) => acc + d.cantidad_devuelta, 0)
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
      monto_descontado: 0, // Las promociones no son deudas monetarias
      motivo: motivoDevolucion.trim() || 'Devolución de muestra escolar',
      usuario_id: user?.id || null,
      fecha: new Date().toISOString(),
    })

    setProcesandoDevolucion(false)

    if (error) {
      setErrorDevolucion(errorMessage(error))
      return
    }

    setDetalleDevolucion(null)
    if (notaSeleccionadaId) {
      abrirDetalle({ id: notaSeleccionadaId } as NotaListada)
    }
    cargarPromociones()
  }

  const handleConcluirPromocion = async (notaId: string) => {
    if (
      !confirm(
        '¿Deseas dar por concluida esta entrega de muestras? Los libros que la docente conservó quedarán registrados como obsequio/promoción para listas escolares. No se genera cobro ni factura.'
      )
    )
      return

    setCerrando(true)
    const { error } = await cerrarPromocion(notaId)
    setCerrando(false)

    if (error) {
      alert(errorMessage(error))
      return
    }

    cerrarDrawer()
    cargarPromociones()
  }

  const handleEliminarNota = async (id: string) => {
    if (!confirm('¿Estás seguro de anular este registro de promoción?')) return

    const { error } = await eliminarNota(id)
    if (error) {
      alert(errorMessage(error))
      return
    }

    cerrarDrawer()
    cargarPromociones()
  }

  const promocionesFiltradas = promociones.filter((p) => {
    const coincideTexto =
      p.correlativo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())

    if (!coincideTexto) return false

    if (filtroEstado === 'abiertas') return p.estado_flotante === 'abierta'
    if (filtroEstado === 'cerradas') return p.estado_flotante === 'cerrada'
    return true
  })

  const totalAbiertas = promociones.filter((p) => p.estado_flotante === 'abierta').length
  const totalCerradas = promociones.filter((p) => p.estado_flotante === 'cerrada').length

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Acciones ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Promociones y Muestras
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Control de entregas de cortesía a docentes y colegios para adopción escolar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/vender">
            <Button variant="primary" size="md" className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Entrega de Muestras
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Tarjetas de Métricas ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-5">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Muestras en Curso
              </span>
              <Badge variant="warning" className="text-[10px]">En Evaluación</Badge>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalAbiertas}</p>
            <p className="mt-1 text-xs text-muted-foreground">Colegios con libros de prueba activos</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-purple-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Naturaleza Comercial
              </span>
              <Badge variant="info" className="text-[10px]">Sin Cobro</Badge>
            </div>
            <p className="font-bold text-lg md:text-xl text-foreground">Cortesía / Muestra</p>
            <p className="mt-1 text-xs text-muted-foreground">Libros obsequiados para adopción escolar</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Concluidas / Cerradas
              </span>
              <Badge variant="disponible" className="text-[10px]">Finalizadas</Badge>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalCerradas}</p>
            <p className="mt-1 text-xs text-muted-foreground">Muestras con ciclo de adopción cerrado</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Toolbar de Filtros y Búsqueda (h-10 homogénea) ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFiltroEstado('todas')}
            className={cn(
              'h-full rounded-lg px-3.5 text-xs font-medium transition-all',
              filtroEstado === 'todas'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todas ({promociones.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('abiertas')}
            className={cn(
              'h-full rounded-lg px-3.5 text-xs font-medium transition-all',
              filtroEstado === 'abiertas'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            En Curso ({totalAbiertas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEstado('cerradas')}
            className={cn(
              'h-full rounded-lg px-3.5 text-xs font-medium transition-all',
              filtroEstado === 'cerradas'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Concluidas ({totalCerradas})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por correlativo o docente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20 transition-all"
          />
        </div>
      </div>

      {/* ─── Tabla de Promociones ─── */}
      {cargando && promociones.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : promocionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No hay notas de promoción en esta categoría.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Puedes emitir una entrega de muestras seleccionando &quot;Promoción&quot; en el Punto de Venta.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nota / Código</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Colegio / Docente</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Tipo</th>
                  <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Fecha de Entrega</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {promocionesFiltradas.map((promo) => (
                  <tr
                    key={promo.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-foreground text-xs">
                      {promo.correlativo}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {promo.cliente_nombre}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={promo.estado_flotante === 'abierta' ? 'warning' : 'disponible'}>
                        {promo.estado_flotante === 'abierta' ? 'En Evaluación' : 'Concluida'}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3.5 sm:table-cell">
                      <span className="text-xs text-muted-foreground">Muestras Gratuitas</span>
                    </td>
                    <td className="hidden px-4 py-3.5 font-mono text-xs text-muted-foreground md:table-cell">
                      {formatDate(promo.fecha_creacion)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs rounded-lg"
                        onClick={() => abrirDetalle(promo)}
                      >
                        Ver Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer Detalle de la Nota de Promoción */}
      <Drawer
        open={Boolean(notaSeleccionadaId)}
        onClose={cerrarDrawer}
        title={notaCompleta ? `Muestras Escolares — ${notaCompleta.correlativo}` : 'Cargando...'}
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
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Colegio / Docente</span>
                    <p className="font-semibold text-sm text-foreground">{notaCompleta.cliente_nombre}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Entrega</span>
                    <p className="font-medium text-foreground">{formatDate(notaCompleta.fecha_creacion)}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-border/40 pt-2 mt-1">
                    <span className="text-muted-foreground">Estado de la Muestra:</span>
                    <Badge variant={notaCompleta.estado_flotante === 'abierta' ? 'warning' : 'pagada'}>
                      {notaCompleta.estado_flotante === 'abierta' ? 'En Evaluación (Abierta)' : 'Promoción Concluida'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Libros Entregados en esta Nota
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {notaCompleta.detalles_nota.length} títulos
                  </span>
                </div>

                {notaCompleta.detalles_nota.map((det) => {
                  const devueltos = getDevueltosDeDetalle(det.id)
                  const conDocente = det.cantidad - devueltos

                  return (
                    <div
                      key={det.id}
                      className="rounded-xl border border-border bg-card p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{det.productos?.nombre ?? 'Libro'}</p>
                          <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {det.productos?.codigo_sku ?? 'S/N'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">Entregados</span>
                          <p className="font-mono font-bold text-foreground">{det.cantidad}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">Devueltos</span>
                          <p className="font-mono font-bold text-rose-600">
                            {devueltos > 0 ? devueltos : '0'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase">En Poder</span>
                          <p className="font-mono font-bold text-emerald-600">{conDocente}</p>
                        </div>
                      </div>

                      {notaCompleta.estado_flotante === 'abierta' && conDocente > 0 && (
                        <div className="border-t border-border/40 pt-2 flex items-center justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirModalDevolucion(det)}
                            className="h-8 px-3 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Devolver este libro a bodega
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Historial de Devoluciones */}
              {notaCompleta.devoluciones.length > 0 && (
                <div className="space-y-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                    <Package className="h-3.5 w-3.5" />
                    <span>Reingresos al Inventario Realizados:</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {notaCompleta.devoluciones.map((dev) => (
                      <li key={dev.id} className="flex items-center justify-between border-b border-rose-500/10 pb-1 last:border-0">
                        <span>
                          <strong className="font-mono text-foreground">+{dev.cantidad_devuelta} uds.</strong> — <span className="italic">{dev.motivo || 'Devolución de muestra'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">{formatDate(dev.fecha)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-4 space-y-2 shrink-0">
              {notaCompleta.estado_flotante === 'abierta' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleConcluirPromocion(notaCompleta.id)}
                  disabled={cerrando}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {cerrando ? 'Concluyendo...' : 'Finalizar Promoción (Libros Conservados como Obsequio)'}
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

      {/* Modal Devolver Libro al Inventario */}
      <Modal
        open={Boolean(detalleDevolucion)}
        onClose={() => setDetalleDevolucion(null)}
        title="Devolver Libro al Inventario"
      >
        {detalleDevolucion && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Selecciona la cantidad de libros que la docente/colegio no va a utilizar para que reingresen inmediatamente a tu inventario activo en bodega.
            </p>

            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground">Título:</span>
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
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
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
                placeholder="Ej: Docente no aprobó para lista escolar"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
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
