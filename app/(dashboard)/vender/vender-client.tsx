'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/ui/error-message'
import { crearNota } from '@/lib/actions/notas'
import type { ProductoConStock } from '@/lib/actions/productos'
import { formatUsd, formatVes } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

/** Tasa temporal usada cuando aún no hay ninguna registrada en `tasas_cambio`. */
const TASA_FALLBACK = 42.5

type Moneda = 'USD' | 'VES'

interface ItemCarrito {
  productoId: string
  nombre: string
  sku: string
  precioUsd: number
  cantidad: number
}

interface VenderClientProps {
  /** Catálogo real de productos activos con su stock calculado. */
  productos: ProductoConStock[]
  /** Tasa USD/VES vigente; `null` si no hay ninguna registrada. */
  tasaVes: number | null
}

export default function VenderClient({ productos, tasaVes }: VenderClientProps) {
  const tasa = tasaVes ?? TASA_FALLBACK
  const [busqueda, setBusqueda] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('USD')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [cliente, setCliente] = useState('Cliente General')
  const [emitiendo, setEmitiendo] = useState(false)
  const [notaEmitida, setNotaEmitida] = useState(false)
  const [errorEmision, setErrorEmision] = useState<string | null>(null)

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [productos, busqueda]
  )

  const subtotal = carrito.reduce((acc, item) => acc + item.precioUsd * item.cantidad, 0)

  const formatPrecio = (usd: number) =>
    moneda === 'USD' ? formatUsd(usd) : formatVes(usd, tasa)

  const agregarProducto = (producto: ProductoConStock) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id)
      if (existente) {
        return prev.map((i) =>
          i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          sku: producto.codigo_sku,
          precioUsd: producto.precio_usd,
          cantidad: 1,
        },
      ]
    })
  }

  const actualizarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) =>
          i.productoId === productoId ? { ...i, cantidad: i.cantidad + delta } : i
        )
        .filter((i) => i.cantidad > 0)
    )
  }

  const emitirNota = async () => {
    if (carrito.length === 0 || emitiendo) return
    setEmitiendo(true)
    setErrorEmision(null)

    const { error } = await crearNota(
      {
        cliente_nombre: cliente || 'Consumidor Final',
        subtotal_usd: subtotal,
        total_usd: subtotal,
        estado: 'pagada',
      },
      carrito.map((item) => ({
        producto_id: item.productoId,
        cantidad: item.cantidad,
        precio_unitario_usd: item.precioUsd,
        subtotal_usd: item.precioUsd * item.cantidad,
      }))
    )

    setEmitiendo(false)
    if (error) {
      setErrorEmision(errorMessage(error))
      return
    }

    setNotaEmitida(true)
    setCarrito([])
    setTimeout(() => setNotaEmitida(false), 2500)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/pedidos"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Pedidos
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Punto de Venta</h2>
          <p className="text-muted-foreground">Emite notas y registra detalles de venta.</p>
        </div>

        {/* Switch bimoneda */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1">
          {(['USD', 'VES'] as Moneda[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoneda(m)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                moneda === m
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'USD' ? '$ USD' : 'Bs. VES'}
            </button>
          ))}
          <span className="hidden px-2 font-mono text-[10px] text-muted-foreground sm:inline">
            1$ = {tasa} Bs.
          </span>
        </div>
      </div>

      {/* Banner de tasa faltante */}
      {tasaVes === null && (
        <ErrorMessage
          severity="warning"
          message={`No hay una tasa de cambio registrada. Se está usando ${TASA_FALLBACK} Bs./USD de forma temporal.`}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Catálogo */}
        <div className="space-y-4 lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar producto o SKU..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
            />
          </div>

          {productosFiltrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay productos que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {productosFiltrados.map((producto) => (
                <Card
                  key={producto.id}
                  className="cursor-pointer transition-all hover:border-primary-accent/30"
                  onClick={() => agregarProducto(producto)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-foreground">{producto.nombre}</p>
                      <span className="mt-1 inline-block rounded-lg bg-muted/80 px-2 py-0.5 font-mono text-[10px] tracking-tight text-muted-foreground">
                        {producto.codigo_sku}
                      </span>
                      <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                        {formatPrecio(producto.precio_usd)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="font-mono text-lg font-bold text-foreground">{producto.stock}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Ticket / Nota en curso */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-l-4 border-l-primary-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Nota en Curso
              </CardTitle>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre del cliente"
                className="mt-2 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {carrito.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Selecciona productos del catálogo
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {carrito.map((item) => (
                    <div
                      key={item.productoId}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.nombre}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatPrecio(item.precioUsd)} × {item.cantidad}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.productoId, -1)}
                          className="rounded-lg p-1 hover:bg-muted"
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-mono text-sm">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.productoId, 1)}
                          className="rounded-lg p-1 hover:bg-muted"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.productoId, -item.cantidad)}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-500/10"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {errorEmision && (
                <div className="rounded-[12px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <strong>No se pudo emitir la nota:</strong> {errorEmision}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-mono text-xl font-bold text-foreground">
                    {formatPrecio(subtotal)}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                disabled={carrito.length === 0 || emitiendo}
                onClick={emitirNota}
              >
                {emitiendo
                  ? 'Emitiendo...'
                  : notaEmitida
                    ? 'Nota emitida ✓'
                    : 'Emitir Nota'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barra inferior móvil */}
      {carrito.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{carrito.length} productos</p>
              <p className="font-mono text-lg font-bold">{formatPrecio(subtotal)}</p>
            </div>
            <Button variant="primary" disabled={emitiendo} onClick={emitirNota}>
              {emitiendo ? 'Emitiendo...' : 'Emitir Nota'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
