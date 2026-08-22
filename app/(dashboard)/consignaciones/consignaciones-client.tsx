'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  Handshake,
  Plus,
  Search,
  CalendarCheck,
  ArrowRight,
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
  procesarCorteConsignacion,
  eliminarNota,
  type Nota,
  type NotaCompleta,
  type ItemCorte,
  type Devolucion,
} from '@/lib/actions/notas'
import { formatUsd, formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

type NotaListada = Nota & { devoluciones: Devolucion[] }

interface ConsignacionesClientProps {
  initialConsignaciones: NotaListada[]
}

export default function ConsignacionesClient({ initialConsignaciones }: ConsignacionesClientProps) {
  const [consignaciones, setConsignaciones] = useState<NotaListada[]>(initialConsignaciones)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'abiertas' | 'cerradas'>('abiertas')
  const [busqueda, setBusqueda] = useState('')

  // Drawer
  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null)
  const [notaCompleta, setNotaCompleta] = useState<NotaCompleta | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  // Modal de Corte Semanal
  const [modalCorteAbierto, setModalCorteAbierto] = useState(false)
  const [corteItems, setCorteItems] = useState<Record<string, { vendidos: number; devueltos: number }>>({})
  const [procesandoCorte, setProcesandoCorte] = useState(false)
  const [errorCorte, setErrorCorte] = useState<string | null>(null)

  // Auth RBAC
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin' || user?.rol === 'developer'

  const cargarConsignaciones = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getNotas('consignacion')
    if (error) {
      setError(errorMessage(error))
    } else {
      setConsignaciones((data as NotaListada[]) ?? [])
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
    setModalCorteAbierto(false)
  }

  const getDevueltosDeDetalle = (detalleId: string) => {
    if (!notaCompleta) return 0
    return notaCompleta.devoluciones
      .filter((d) => d.detalle_nota_id === detalleId)
      .reduce((acc, d) => acc + d.cantidad_devuelta, 0)
  }

  const abrirModalCorte = () => {
    if (!notaCompleta) return
    const inicial: Record<string, { vendidos: number; devueltos: number }> = {}
    notaCompleta.detalles_nota.forEach((d) => {
      inicial[d.id] = { vendidos: 0, devueltos: 0 }
    })
    setCorteItems(inicial)
    setErrorCorte(null)
    setModalCorteAbierto(true)
  }

  const handleCorteChange = (detalleId: string, campo: 'vendidos' | 'devueltos', valor: string, max: number) => {
    let num = parseInt(valor, 10)
    if (isNaN(num)) num = 0
    if (num < 0) num = 0

    setCorteItems((prev) => {
      const actual = prev[detalleId] || { vendidos: 0, devueltos: 0 }
      const otroCampo = campo === 'vendidos' ? 'devueltos' : 'vendidos'

      if (num + actual[otroCampo] > max) {
        num = max - actual[otroCampo]
      }

      return {
        ...prev,
        [detalleId]: {
          ...actual,
          [campo]: num,
        },
      }
    })
  }

  const handleProcesarCorte = async () => {
    if (!notaCompleta) return

    const itemsPayload: ItemCorte[] = Object.entries(corteItems)
      .map(([detalleId, vals]) => {
        const detalle = notaCompleta.detalles_nota.find((d) => d.id === detalleId)
        return {
          detalle_nota_id: detalleId,
          producto_id: detalle?.producto_id ?? '',
          vendidos: vals.vendidos,
          devueltos: vals.devueltos,
        }
      })
      .filter((i) => i.vendidos > 0 || i.devueltos > 0)

    if (itemsPayload.length === 0) {
      setErrorCorte('Debes especificar al menos un libro vendido o devuelto en este corte.')
      return
    }

    setProcesandoCorte(true)
    setErrorCorte(null)

    const { error } = await procesarCorteConsignacion(notaCompleta.id, itemsPayload)

    setProcesandoCorte(false)
    if (error) {
      setErrorCorte(errorMessage(error))
      return
    }

    setModalCorteAbierto(false)
    if (notaSeleccionadaId) {
      abrirDetalle({ id: notaSeleccionadaId } as NotaListada)
    }
    cargarConsignaciones()
  }

  const handleEliminarNota = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de consignación?')) return

    const { error } = await eliminarNota(id)
    if (error) {
      alert(errorMessage(error))
      return
    }

    cerrarDrawer()
    cargarConsignaciones()
  }

  const consignacionesFiltradas = consignaciones.filter((c) => {
    const coincideTexto =
      c.correlativo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())

    if (!coincideTexto) return false

    if (filtroEstado === 'abiertas') return c.estado_flotante === 'abierta'
    if (filtroEstado === 'cerradas') return c.estado_flotante === 'cerrada'
    return true
  })

  const totalAbiertas = consignaciones.filter((c) => c.estado_flotante === 'abierta').length
  const totalCerradas = consignaciones.filter((c) => c.estado_flotante === 'cerrada').length
  const valorEnConsignacion = consignaciones
    .filter((c) => c.estado_flotante === 'abierta')
    .reduce((acc, c) => acc + c.total_usd, 0)

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Acciones ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Consignaciones de Libros
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Control de inventario entregado a vendedores y librerías externas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/vender">
            <Button variant="primary" size="md" className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva Consignación
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Tarjetas de Métricas ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-5">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-cyan-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Consignaciones Activas
              </span>
              <Badge variant="info" className="text-[10px]">En Calle</Badge>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalAbiertas}</p>
            <p className="mt-1 text-xs text-muted-foreground">Vendedores con libros pendientes de corte</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valor en Consignación
              </span>
              <span className="font-mono text-xs text-muted-foreground">Flotante</span>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{formatUsd(valorEnConsignacion)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Se convierte en saldo al hacer los cortes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Finalizadas / Rendidas
              </span>
              <Badge variant="pagada" className="text-[10px]">Cerradas</Badge>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalCerradas}</p>
            <p className="mt-1 text-xs text-muted-foreground">Cortes 100% liquidados y rendidos</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Toolbar de Filtros y Búsqueda (h-10 homogénea) ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
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
            Activas en Calle ({totalAbiertas})
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
            Finalizadas ({totalCerradas})
          </button>
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
            Todas ({consignaciones.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por vendedor o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20 transition-all"
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* ─── Tabla de Consignaciones ─── */}
      {cargando && consignaciones.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : consignacionesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Handshake className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">No hay notas de consignación en esta vista.</p>
            <p className="text-xs text-muted-foreground mt-1">Crea una nueva consignación desde el botón superior.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nota / Código</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendedor</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Monto en Calle</th>
                  <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Fecha de Entrega</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {consignacionesFiltradas.map((consig) => (
                  <tr
                    key={consig.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-foreground text-xs">
                      {consig.correlativo}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">
                      {consig.cliente_nombre}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={consig.estado_flotante === 'abierta' ? 'info' : 'pagada'}>
                        {consig.estado_flotante === 'abierta' ? 'En Calle' : 'Finalizada'}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3.5 font-mono sm:table-cell">
                      {formatUsd(consig.total_usd)}
                    </td>
                    <td className="hidden px-4 py-3.5 text-xs text-muted-foreground md:table-cell">
                      {formatDate(consig.fecha_creacion)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirDetalle(consig)}
                        className="h-8 px-2.5 text-xs rounded-lg gap-1 font-semibold"
                      >
                        Ver / Hacer Corte
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer */}
      <Drawer
        open={Boolean(notaSeleccionadaId)}
        onClose={cerrarDrawer}
        title={notaCompleta ? `Consignación — ${notaCompleta.correlativo}` : 'Cargando...'}
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
                    <span className="text-muted-foreground">Vendedor Asignado</span>
                    <p className="font-semibold text-sm text-foreground">{notaCompleta.cliente_nombre}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de Entrega</span>
                    <p className="font-medium text-foreground">{formatDate(notaCompleta.fecha_creacion)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado</span>
                    <div className="mt-0.5">
                      <Badge variant={notaCompleta.estado_flotante === 'abierta' ? 'info' : 'pagada'}>
                        {notaCompleta.estado_flotante === 'abierta' ? 'En Calle (Abierta)' : 'Cerrada (100% Rendida)'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monto Flotante</span>
                    <p className="font-mono font-bold text-base text-foreground">{formatUsd(notaCompleta.total_usd)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inventario en Manos del Vendedor
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {notaCompleta.detalles_nota.length} ítems
                  </span>
                </div>

                {notaCompleta.detalles_nota.map((det) => {
                  const devueltos = getDevueltosDeDetalle(det.id)
                  const enMano = det.cantidad - devueltos

                  return (
                    <div
                      key={det.id}
                      className="rounded-xl border border-border bg-card p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-foreground">{det.productos?.nombre ?? 'Libro'}</p>
                          <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {det.productos?.codigo_sku ?? 'S/N'}
                          </span>
                        </div>
                        <span className="font-mono text-sm font-semibold">
                          {formatUsd(det.precio_unitario_usd * enMano)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                        <span className="text-muted-foreground">
                          Entregados iniciales: <strong className="font-mono text-foreground">{det.cantidad}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          {devueltos > 0 && (
                            <span className="text-rose-500 font-medium">
                              (Devueltos/Vendidos: {devueltos})
                            </span>
                          )}
                          <span className="text-cyan-600 font-semibold">
                            Pendientes: {enMano} uds.
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {notaCompleta.devoluciones.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Historial de Cortes y Devoluciones Anteriores:
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {notaCompleta.devoluciones.map((dev) => (
                      <li key={dev.id} className="flex items-center justify-between">
                        <span>
                          {dev.cantidad_devuelta} uds. — <span className="italic">{dev.motivo || 'Corte de consignación'}</span>
                        </span>
                        <span className="font-mono text-emerald-600">
                          {formatUsd(dev.monto_descontado)}
                        </span>
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
                  onClick={abrirModalCorte}
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Realizar Corte Semanal
                </Button>
              )}

              {esAdmin && (
                <Button
                  variant="ghost"
                  className="w-full text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={() => handleEliminarNota(notaCompleta.id)}
                >
                  Anular Registro de Consignación
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Modal Corte Semanal */}
      <Modal
        open={modalCorteAbierto}
        onClose={() => setModalCorteAbierto(false)}
        title={`Rendición y Corte Semanal — ${notaCompleta?.correlativo}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Ingresa cuántos libros vendió el vendedor (se registrarán como ingreso de venta) y cuántos devolvió a la bodega central (reingresan al stock). Los no reportados seguirán en consignación.
          </p>

          <div className="max-h-80 overflow-y-auto rounded-xl border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Libro (Pendientes)</th>
                  <th className="px-2 py-2 text-center font-medium">Vendidos ($)</th>
                  <th className="px-2 py-2 text-center font-medium">Devueltos (Stock)</th>
                </tr>
              </thead>
              <tbody>
                {notaCompleta?.detalles_nota.map((det) => {
                  const devueltosHist = getDevueltosDeDetalle(det.id)
                  const maxActivos = det.cantidad - devueltosHist
                  const vals = corteItems[det.id] || { vendidos: 0, devueltos: 0 }

                  if (maxActivos === 0) return null

                  return (
                    <tr key={det.id} className="border-t border-border/50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground">{det.productos?.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">{maxActivos} uds. en mano</p>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={vals.vendidos || ''}
                          onChange={(e) => handleCorteChange(det.id, 'vendidos', e.target.value, maxActivos)}
                          className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono text-xs focus:border-primary-accent/50 focus:outline-none"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={vals.devueltos || ''}
                          onChange={(e) => handleCorteChange(det.id, 'devueltos', e.target.value, maxActivos)}
                          className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono text-xs focus:border-primary-accent/50 focus:outline-none"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {errorCorte && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
              {errorCorte}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalCorteAbierto(false)} disabled={procesandoCorte}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleProcesarCorte} disabled={procesandoCorte}>
              {procesandoCorte ? 'Procesando...' : 'Aplicar Corte Semanal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
