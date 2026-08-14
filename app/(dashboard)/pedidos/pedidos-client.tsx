'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Plus, RotateCcw } from 'lucide-react'
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
  eliminarNota,
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
  return nota.devoluciones.reduce((acc, d) => {
    if (d.detalle_nota_id === detalle.id) return acc + d.cantidad_devuelta
    if (d.detalle_nota_id === null && d.producto_id === detalle.producto_id) {
      return acc + d.cantidad_devuelta
    }
    return acc
  }, 0)
}

interface PedidosClientProps {
  initialNotas: NotaListada[]
}

export default function PedidosClient({ initialNotas }: PedidosClientProps) {
  const [notas, setNotas] = useState<NotaListada[]>(initialNotas)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'

  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null)
  const [notaCompleta, setNotaCompleta] = useState<NotaCompleta | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  const [detalleDevolucion, setDetalleDevolucion] = useState<DetalleNota | null>(null)
  const [cantidadDevolver, setCantidadDevolver] = useState('1')
  const [motivo, setMotivo] = useState('Devolución de producto')
  const [devolviendo, setDevolviendo] = useState(false)
  const [devolucionOk, setDevolucionOk] = useState(false)
  const [errorDevolucion, setErrorDevolucion] = useState<string | null>(null)

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

  const abrirDetalle = async (nota: NotaListada) => {
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
  }

  const abrirDevolucion = (detalle: DetalleNota) => {
    setDetalleDevolucion(detalle)
    setCantidadDevolver('1')
    setMotivo('Muestra devuelta por el cliente')
    setDevolucionOk(false)
    setErrorDevolucion(null)
  }

  const devueltosHist = detalleDevolucion && notaCompleta
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
      motivo: motivo.trim() || 'Devolución de producto',
      usuario_id: user?.id ?? null,
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
    }, 1500)
  }

  const handleEliminarNota = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar (anular) esta nota por completo? Esta acción no se puede deshacer.')) return
    
    const { error } = await eliminarNota(id)
    if (error) {
      alert(errorMessage(error))
      return
    }
    
    setNotaSeleccionadaId(null)
    setNotaCompleta(null)
    cargarNotas()
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Pedidos</h2>
          <p className="text-muted-foreground text-sm">
            Listado e historial de ventas directas realizadas y devoluciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={cargarNotas} disabled={cargando}>
            <RotateCcw className={cn('mr-1 h-3.5 w-3.5', cargando && 'animate-spin')} />
            Actualizar
          </Button>
          <Link href="/vender">
            <Button variant="primary" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Nueva Nota / Venta
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <Card>
        <CardContent className="p-0">
          {cargando && notas.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Correlativo</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Subtotal</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((nota) => (
                    <tr
                      key={nota.id}
                      onClick={() => abrirDetalle(nota)}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                        {nota.correlativo}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {nota.cliente_nombre}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={estadoBadgeMap[nota.estado]}>{nota.estado}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatDate(nota.fecha_creacion)}
                      </td>
                      <td className="px-4 py-3.5 font-mono tracking-tight text-muted-foreground">
                        {formatUsd(nota.subtotal_usd)}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold tracking-tight text-foreground">
                        {formatUsd(nota.total_usd)}
                      </td>
                    </tr>
                  ))}
                  {notas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Aún no hay notas emitidas. Crea la primera en /vender.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium text-foreground">{notaCompleta.cliente_nombre}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={estadoBadgeMap[notaCompleta.estado]}>
                    {notaCompleta.estado}
                  </Badge>
                  <span className="font-mono text-sm font-bold">{formatUsd(notaCompleta.total_usd)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Productos
                </p>
                {notaCompleta.detalles_nota.map((detalle) => {
                  const devuelto = cantidadDevueltaDe(notaCompleta, detalle)
                  const disponible = detalle.cantidad - devuelto
                  return (
                    <div
                      key={detalle.id}
                      className="rounded-xl border border-border/60 bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {detalle.productos?.nombre ?? 'Producto'}
                          </p>
                          <span className="mt-1 inline-block rounded-lg bg-muted/80 px-2 py-0.5 font-mono text-[10px]">
                            {detalle.productos?.codigo_sku ?? 'S/N'}
                          </span>
                          <p className="mt-2 font-mono text-xs text-muted-foreground">
                            {detalle.cantidad} uds. × {formatUsd(detalle.precio_unitario_usd)}
                            {devuelto > 0 && (
                              <span className="ml-2 text-rose-500">
                                (−{devuelto} devueltas)
                              </span>
                            )}
                          </p>
                        </div>
                        <p className="font-mono font-semibold">{formatUsd(detalle.subtotal_usd)}</p>
                      </div>
                      {disponible > 0 && notaCompleta.estado !== 'anulada' && (
                        <Button
                          variant="outline"
                          className="mt-3 w-full text-xs"
                          onClick={() => abrirDevolucion(detalle)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Devolver Producto
                        </Button>
                      )}
                    </div>
                  )
                })}
                {notaCompleta.detalles_nota.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Esta nota no tiene productos registrados.
                  </p>
                )}
              </div>

              {esAdmin && (
                <div className="mt-6 border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    className="w-full text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                    onClick={() => handleEliminarNota(notaCompleta.id)}
                  >
                    Anular / Eliminar Nota
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </Drawer>

      {/* Modal devolución */}
      <Modal
        open={Boolean(detalleDevolucion)}
        onClose={() => setDetalleDevolucion(null)}
        title="Devolver Producto"
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
                className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 font-mono text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </div>
            <div>
              <label htmlFor="motivo-devolucion" className="mb-1.5 block text-sm font-medium">
                Motivo
              </label>
              <input
                id="motivo-devolucion"
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Monto a descontar:{' '}
              <span className="font-mono font-semibold text-foreground">
                {formatUsd((parseInt(cantidadDevolver, 10) || 0) * detalleDevolucion.precio_unitario_usd)}
              </span>
            </p>
            {errorDevolucion && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>No se pudo registrar la devolución:</strong> {errorDevolucion}
              </div>
            )}
            <Button
              variant="primary"
              className={cn('w-full')}
              disabled={
                devolviendo ||
                parseInt(cantidadDevolver, 10) < 1 ||
                parseInt(cantidadDevolver, 10) > cantidadMaxima
              }
              onClick={confirmarDevolucion}
            >
              {devolviendo
                ? 'Registrando...'
                : devolucionOk
                  ? 'Devolución registrada ✓'
                  : 'Confirmar Devolución'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
