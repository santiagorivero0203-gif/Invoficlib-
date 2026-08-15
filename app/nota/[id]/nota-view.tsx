'use client'

/**
 * app/nota/[id]/nota-view.tsx
 * -------------------------------------------------------
 * Client Component de visualización pública de notas.
 *
 * - Sin sesión (escaneo QR externo): Solo lectura, diseño
 *   limpio de comprobante digital.
 * - Con sesión (usuario del sistema): Vista con acciones
 *   (ir a pedidos, estado actual en vivo).
 * -------------------------------------------------------
 */

import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { formatUsd, formatDate } from '@/lib/format'

// ── Tipos locales ────────────────────────────────────────

interface Producto {
  nombre: string
  codigo_sku: string
}

interface DetalleNota {
  id: string
  producto_id: string
  cantidad: number
  precio_unitario_usd: number
  subtotal_usd: number
  productos: Producto | null
}

interface Devolucion {
  id: string
  detalle_nota_id: string | null
  producto_id: string
  cantidad_devuelta: number
}

interface Nota {
  id: string
  correlativo: string
  cliente_nombre: string
  estado: 'pagada' | 'parcial' | 'anulada'
  tipo_salida: 'venta' | 'promocion' | 'consignacion'
  estado_flotante: 'abierta' | 'cerrada'
  total_usd: number
  subtotal_usd: number
  observaciones: string | null
  fecha_creacion: string
  detalles_nota: DetalleNota[]
  devoluciones: Devolucion[]
}

interface NotaViewProps {
  nota: Nota
  isAuthenticated: boolean
}

// ── Helpers ──────────────────────────────────────────────

const estadoConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: React.ReactNode; color: string }
> = {
  pagada: {
    label: 'Pagada',
    variant: 'pagada',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  parcial: {
    label: 'Pago Parcial',
    variant: 'parcial',
    icon: <Clock className="h-5 w-5 text-amber-500" />,
    color: 'text-amber-600 dark:text-amber-400',
  },
  anulada: {
    label: 'Anulada',
    variant: 'anulada',
    icon: <XCircle className="h-5 w-5 text-rose-500" />,
    color: 'text-rose-600 dark:text-rose-400',
  },
}

const tipoLabel: Record<string, string> = {
  venta: 'Venta',
  promocion: 'Promoción / Muestra',
  consignacion: 'Consignación',
}

// ── Componente principal ─────────────────────────────────

export default function NotaView({ nota, isAuthenticated }: NotaViewProps) {
  const estadoInfo = estadoConfig[nota.estado] ?? estadoConfig.parcial
  const totalItems = nota.detalles_nota.reduce((acc, d) => acc + d.cantidad, 0)

  /** Unidades devueltas por detalle */
  const devueltosDe = (detalleId: string, productoId: string) =>
    nota.devoluciones
      .filter((d) => d.detalle_nota_id === detalleId || (d.detalle_nota_id === null && d.producto_id === productoId))
      .reduce((acc, d) => acc + d.cantidad_devuelta, 0)

  // Si no está autenticado, proteger la nota y requerir acceso interno
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-border bg-card p-6 sm:p-8 text-center shadow-lg space-y-5 animate-pop-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Acceso Restringido</h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Las notas y comprobantes de <strong>Invoficlib</strong> solo pueden ser consultadas por personal autorizado dentro del sistema.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground">
            Para escanear y gestionar esta nota, abre la app de Invoficlib y dirígete a:
            <span className="block font-semibold text-foreground mt-1">Configuración → Lector de Códigos QR</span>
          </div>
          <Link href={`/pedidos?notaId=${nota.id}`} className="block">
            <Button variant="primary" className="w-full">
              Iniciar Sesión / Entrar a la App
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Banner de sesión activa */}
        <div className="rounded-2xl border border-primary-accent/20 bg-primary-accent/5 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <ExternalLink className="h-4 w-4 text-primary-accent shrink-0" />
            <span>Estás viendo la nota en vivo desde el sistema.</span>
          </div>
          <Link href={`/pedidos?notaId=${nota.id}`}>
            <Button variant="primary" size="sm">
              Gestionar en Pedidos
            </Button>
          </Link>
        </div>

        {/* Encabezado de la Nota */}
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Header con estado */}
          <div className={`px-6 py-5 border-b border-border flex items-center justify-between gap-4 ${
            nota.estado === 'anulada' ? 'bg-rose-500/5' :
            nota.estado === 'pagada' ? 'bg-emerald-500/5' : 'bg-amber-500/5'
          }`}>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                Comprobante Digital · {tipoLabel[nota.tipo_salida] ?? 'Nota'}
              </p>
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {nota.correlativo}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                {estadoInfo.icon}
                <span className={`font-semibold text-sm ${estadoInfo.color}`}>
                  {estadoInfo.label}
                </span>
              </div>
              <Badge variant={estadoInfo.variant} className="text-[10px]">
                {nota.estado_flotante === 'abierta' ? 'Entrega Pendiente' : 'Cerrada'}
              </Badge>
            </div>
          </div>

          {/* Info cliente y fecha */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Cliente</p>
              <p className="font-semibold text-foreground">{nota.cliente_nombre}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Fecha de Emisión</p>
              <p className="font-mono text-sm text-foreground">{formatDate(nota.fecha_creacion)}</p>
            </div>
            {nota.observaciones && (
              <div className="col-span-full">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Observaciones</p>
                <p className="text-sm text-muted-foreground">{nota.observaciones}</p>
              </div>
            )}
          </div>

          {/* Tabla de productos */}
          <div className="px-6 py-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
              Productos ({nota.detalles_nota.length} líneas · {totalItems} unidades)
            </p>
            <div className="space-y-2">
              {nota.detalles_nota.map((detalle) => {
                const devueltos = devueltosDe(detalle.id, detalle.producto_id)
                const disponibles = detalle.cantidad - devueltos
                return (
                  <div
                    key={detalle.id}
                    className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {detalle.productos?.nombre ?? 'Producto'}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {detalle.productos?.codigo_sku ?? 'S/N'} · {detalle.cantidad} uds. × {formatUsd(detalle.precio_unitario_usd)}
                        {devueltos > 0 && (
                          <span className="ml-2 text-rose-500 font-semibold">
                            (−{devueltos} devueltas, {disponibles} pendientes)
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="font-mono font-bold text-foreground shrink-0">
                      {formatUsd(detalle.subtotal_usd)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Totales */}
          <div className="px-6 py-5 border-t border-border bg-muted/20">
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal USD</span>
                <span className="font-mono">{formatUsd(nota.subtotal_usd)}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                <span>Total USD</span>
                <span className="font-mono text-lg">{formatUsd(nota.total_usd)}</span>
              </div>
            </div>
          </div>

          {/* Advertencia si nota anulada */}
          {nota.estado === 'anulada' && (
            <div className="mx-6 mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Esta nota ha sido anulada. El inventario ha sido reintegrado.
            </div>
          )}

          {/* Pie del comprobante */}
          <div className="px-6 py-4 border-t border-border/50 text-center">
            <p className="text-[10px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-slate-500">Documento No Fiscal</span>
              {' · '}Comprobante interno de entrega · Invoficlib
            </p>
            <p className="font-mono text-[9px] text-muted-foreground/50 mt-0.5 break-all">{nota.id}</p>
          </div>
        </div>

        {/* Volver (solo en modo autenticado) */}
        {isAuthenticated ? (
          <div className="flex justify-center">
            <Link href="/pedidos">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Volver a Pedidos
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Esta página es un comprobante digital generado por Invoficlib.
            El estado que ves es el vigente al momento de consultar.
          </p>
        )}
      </div>
    </div>
  )
}
