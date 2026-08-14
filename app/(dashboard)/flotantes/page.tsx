'use client'

/**
 * app/(dashboard)/flotantes/page.tsx
 * -------------------------------------------------------
 * Panel de Notas Flotantes (Fase 3).
 * Muestra las promociones y consignaciones abiertas.
 * Permite:
 * - Liquidar promociones (convierte a venta cerrada).
 * - Realizar corte de consignaciones (ventas + devoluciones).
 * -------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react'
import {
  RotateCcw,
  CheckCircle,
  Building2,
  ShoppingBag,
  Receipt,
  FileCheck2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Drawer } from '@/components/ui/drawer'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getNotasFlotantes,
  getNotaCompleta,
  liquidarPromocion,
  procesarCorteConsignacion,
  type Nota,
  type NotaCompleta,
  type ItemCorte,
} from '@/lib/actions/notas'
import { formatUsd, formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

export default function FlotantesPage() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null)
  const [notaCompleta, setNotaCompleta] = useState<NotaCompleta | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  // Liquidación de promoción
  const [liquidando, setLiquidando] = useState(false)

  // Corte de consignación
  const [modalCorteAbierto, setModalCorteAbierto] = useState(false)
  const [corteItems, setCorteItems] = useState<Record<string, { vendidos: number; devueltos: number }>>({})
  const [procesandoCorte, setProcesandoCorte] = useState(false)
  const [errorCorte, setErrorCorte] = useState<string | null>(null)

  const cargarNotas = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getNotasFlotantes()
    if (error) {
      setError(errorMessage(error))
    } else {
      setNotas(data ?? [])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarNotas()
  }, [cargarNotas])

  const abrirDetalle = async (nota: Nota) => {
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
  }

  // ── Acciones de Promoción ──────────────────────────────
  const handleLiquidarPromocion = async (notaId: string) => {
    if (!confirm('¿Desea liquidar esta promoción? Los libros que no han sido devueltos se convertirán en una venta real.')) return

    setLiquidando(true)
    const { error } = await liquidarPromocion(notaId)
    setLiquidando(false)

    if (error) {
      alert(errorMessage(error))
      return
    }

    cerrarDrawer()
    cargarNotas()
  }

  // ── Acciones de Consignación ───────────────────────────
  const abrirModalCorte = () => {
    if (!notaCompleta) return
    // Inicializar estado del corte (todo en 0 por defecto)
    const inicial: Record<string, { vendidos: number; devueltos: number }> = {}
    notaCompleta.detalles_nota.forEach((d) => {
      inicial[d.id] = { vendidos: 0, devueltos: 0 }
    })
    setCorteItems(inicial)
    setErrorCorte(null)
    setModalCorteAbierto(true)
  }

  const cerrarModalCorte = () => {
    setModalCorteAbierto(false)
    setCorteItems({})
    setErrorCorte(null)
  }

  const handleCorteChange = (detalleId: string, campo: 'vendidos' | 'devueltos', valor: string, max: number) => {
    let num = parseInt(valor, 10)
    if (isNaN(num)) num = 0
    if (num < 0) num = 0

    setCorteItems((prev) => {
      const actual = prev[detalleId] || { vendidos: 0, devueltos: 0 }
      const otroCampo = campo === 'vendidos' ? 'devueltos' : 'vendidos'
      
      // Ajustar para no exceder el máximo (cantidad original)
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

    // Construir payload
    const itemsPayload: ItemCorte[] = Object.entries(corteItems).map(([detalleId, vals]) => {
      const detalle = notaCompleta.detalles_nota.find(d => d.id === detalleId)
      return {
        detalle_nota_id: detalleId,
        producto_id: detalle?.producto_id ?? '',
        vendidos: vals.vendidos,
        devueltos: vals.devueltos,
      }
    }).filter(i => i.vendidos > 0 || i.devueltos > 0) // Solo enviar los que tienen cambios

    if (itemsPayload.length === 0) {
      setErrorCorte('Debe indicar al menos un libro vendido o devuelto.')
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

    cerrarModalCorte()
    cerrarDrawer()
    cargarNotas()
  }

  // ── Utilidades ─────────────────────────────────────────
  const cantidadYaDevuelta = (detalleId: string) => {
    if (!notaCompleta) return 0
    return notaCompleta.devoluciones
      .filter((d) => d.detalle_nota_id === detalleId)
      .reduce((acc, d) => acc + d.cantidad_devuelta, 0)
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Notas Flotantes</h2>
          <p className="text-muted-foreground">Gestiona promociones y consignaciones pendientes de cierre.</p>
        </div>
        <Button variant="outline" onClick={cargarNotas} disabled={cargando}>
          <RotateCcw className={cn("mr-2 h-4 w-4", cargando && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Promociones Abiertas</p>
              <p className="text-2xl font-bold text-foreground">
                {notas.filter((n) => n.tipo_salida === 'promocion').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Consignaciones Abiertas</p>
              <p className="text-2xl font-bold text-foreground">
                {notas.filter((n) => n.tipo_salida === 'consignacion').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <ErrorMessage message={error} />}

      {cargando ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : notas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay notas flotantes abiertas.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Correlativo</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Monto</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((nota) => (
                    <tr
                      key={nota.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-foreground">
                        {nota.correlativo}
                      </td>
                      <td className="px-4 py-3">{nota.cliente_nombre}</td>
                      <td className="px-4 py-3">
                        <Badge variant={nota.tipo_salida === 'promocion' ? 'default' : 'info'}>
                          {nota.tipo_salida === 'promocion' ? 'Promoción' : 'Consignación'}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 font-mono sm:table-cell">
                        {formatUsd(nota.total_usd)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatDate(nota.fecha_creacion)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => abrirDetalle(nota)}>
                          Ver Detalle
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

      {/* Drawer de Detalle */}
      <Drawer
        open={!!notaSeleccionadaId}
        onClose={cerrarDrawer}
        title={notaCompleta ? `Nota ${notaCompleta.correlativo}` : 'Cargando nota...'}
        size="md"
      >
        {cargandoDetalle ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
          </div>
        ) : errorDetalle ? (
          <ErrorMessage message={errorDetalle} />
        ) : notaCompleta ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto p-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">{notaCompleta.cliente_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha Emisión</p>
                  <p className="text-foreground">{formatDate(notaCompleta.fecha_creacion)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de Salida</p>
                  <Badge variant={notaCompleta.tipo_salida === 'promocion' ? 'default' : 'info'} className="mt-1">
                    {notaCompleta.tipo_salida === 'promocion' ? 'Promoción' : 'Consignación'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto Total</p>
                  <p className="font-mono text-xl font-bold text-foreground">
                    {formatUsd(notaCompleta.total_usd)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Productos</h3>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cant.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notaCompleta.detalles_nota.map((det) => {
                        const devueltos = cantidadYaDevuelta(det.id)
                        const activos = det.cantidad - devueltos
                        return (
                          <tr key={det.id} className="border-t border-border/50">
                            <td className="px-3 py-3">
                              <p className="font-medium text-foreground">{det.productos?.nombre}</p>
                              {devueltos > 0 && (
                                <p className="text-xs text-rose-500">({devueltos} devueltos)</p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-foreground">
                              {activos} <span className="text-muted-foreground text-xs">/ {det.cantidad}</span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-foreground">
                              {formatUsd(det.precio_unitario_usd * activos)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Acciones del Drawer según tipo */}
            <div className="mt-6 shrink-0 border-t border-border pt-4">
              {notaCompleta.tipo_salida === 'promocion' ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Al liquidar, esta promoción pasará a ser una venta cerrada y sumará a los ingresos.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => handleLiquidarPromocion(notaCompleta.id)}
                    disabled={liquidando}
                  >
                    <FileCheck2 className="mr-2 h-4 w-4" />
                    {liquidando ? 'Liquidando...' : 'Liquidar Promoción'}
                  </Button>
                </div>
              ) : notaCompleta.tipo_salida === 'consignacion' ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Realice el corte semanal indicando qué se vendió y qué se devolvió.
                  </p>
                  <Button variant="primary" onClick={abrirModalCorte}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Realizar Corte
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Modal para Corte de Consignación */}
      <Modal
        open={modalCorteAbierto}
        onClose={cerrarModalCorte}
        title={`Corte de Consignación — ${notaCompleta?.correlativo}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Indique la cantidad de libros vendidos y devueltos para cada ítem. Las cantidades restantes seguirán en estado flotante.
          </p>
          
          <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto (Activos)</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Vendidos</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground">Devueltos</th>
                </tr>
              </thead>
              <tbody>
                {notaCompleta?.detalles_nota.map((det) => {
                  const devueltosHist = cantidadYaDevuelta(det.id)
                  const maxActivos = det.cantidad - devueltosHist
                  const vals = corteItems[det.id] || { vendidos: 0, devueltos: 0 }

                  // Si ya se devolvió o vendió todo en cortes anteriores (maxActivos = 0), no mostrar input
                  if (maxActivos === 0) return null

                  return (
                    <tr key={det.id} className="border-t border-border/50">
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground">{det.productos?.nombre}</p>
                        <p className="text-xs text-muted-foreground">{maxActivos} uds. flotantes</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={maxActivos}
                          value={vals.vendidos || ''}
                          onChange={(e) => handleCorteChange(det.id, 'vendidos', e.target.value, maxActivos)}
                          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-1 focus:ring-primary-accent/20"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={maxActivos}
                          value={vals.devueltos || ''}
                          onChange={(e) => handleCorteChange(det.id, 'devueltos', e.target.value, maxActivos)}
                          className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-1 focus:ring-primary-accent/20"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {errorCorte && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorCorte}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={cerrarModalCorte} disabled={procesandoCorte}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleProcesarCorte} disabled={procesandoCorte}>
              {procesandoCorte ? 'Procesando...' : 'Procesar Corte'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
