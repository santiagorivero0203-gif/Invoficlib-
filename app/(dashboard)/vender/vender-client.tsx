'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ArrowLeft,
  Users,
  Check,
  Building2,
  ShoppingBag,
  User,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import { crearNota } from '@/lib/actions/notas'
import { crearCliente } from '@/lib/actions/clientes'
import type { ProductoConStock } from '@/lib/actions/productos'
import type { Cliente } from '@/lib/actions/clientes'
import type { TipoSalida, EstadoFlotante, TipoCliente } from '@/types/database.types'
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

import { useTasas } from '@/components/providers/tasas-provider'

interface VenderClientProps {
  /** Catálogo real de productos activos con su stock calculado. */
  productos: ProductoConStock[]
  /** Tasa USD/VES vigente; `null` si no hay ninguna registrada. */
  tasaVes?: number | null
  /** Lista de clientes activos para autocompletado y directorio. */
  clientes: Cliente[]
}

export default function VenderClient({ productos, clientes: clientesIniciales }: VenderClientProps) {
  const { tasaUsd } = useTasas()
  const tasa = tasaUsd
  const [busqueda, setBusqueda] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('USD')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])

  // Lista local de clientes (para incluir los nuevos que se registren al vuelo)
  const [clientesLista, setClientesLista] = useState<Cliente[]>(clientesIniciales)

  // Cliente: texto libre + autocompletado opcional del directorio
  const [clienteNombre, setClienteNombre] = useState<string>('Consumidor Final')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [guardarEnDirectorio, setGuardarEnDirectorio] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [tipoSalida, setTipoSalida] = useState<TipoSalida>('venta')
  const [emitiendo, setEmitiendo] = useState(false)
  const [notaEmitida, setNotaEmitida] = useState(false)
  const [errorEmision, setErrorEmision] = useState<string | null>(null)

  // Modal de advertencia de stock insuficiente
  const [modalAdvertenciaStock, setModalAdvertenciaStock] = useState(false)
  const [itemsInsuficientes, setItemsInsuficientes] = useState<
    { nombre: string; sku: string; solicitado: number; disponible: number }[]
  >([])

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [productos, busqueda]
  )

  // Sugerencias de clientes basadas en lo que escribe el usuario
  const sugerenciasClientes = useMemo(() => {
    if (!clienteNombre || clienteNombre === 'Consumidor Final') return clientesLista
    const q = clienteNombre.toLowerCase().trim()
    return clientesLista.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.contacto?.toLowerCase().includes(q) ?? false) ||
        (c.telefono?.toLowerCase().includes(q) ?? false)
    )
  }, [clientesLista, clienteNombre])

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

  const seleccionarClienteDirectorio = (cliente: Cliente) => {
    setClienteNombre(cliente.nombre)
    setClienteId(cliente.id)
    setMostrarSugerencias(false)
    setGuardarEnDirectorio(false)
  }

  const handleClienteInputChange = (valor: string) => {
    setClienteNombre(valor)
    setMostrarSugerencias(true)

    // Si coincide exactamente con uno del directorio, asociarlo
    const coincidencia = clientesLista.find(
      (c) => c.nombre.toLowerCase().trim() === valor.toLowerCase().trim()
    )
    if (coincidencia) {
      setClienteId(coincidencia.id)
    } else {
      setClienteId(null)
    }
  }

  const handleIntentarEmitir = () => {
    if (carrito.length === 0 || emitiendo) {
      setErrorEmision('Agrega productos al carrito para emitir la nota.')
      return
    }

    const insuficientes = carrito
      .map((item) => {
        const prod = productos.find((p) => p.id === item.productoId)
        const disponible = prod?.stock ?? 0
        return {
          nombre: item.nombre,
          sku: item.sku,
          solicitado: item.cantidad,
          disponible,
        }
      })
      .filter((i) => i.solicitado > i.disponible)

    if (insuficientes.length > 0) {
      setItemsInsuficientes(insuficientes)
      setModalAdvertenciaStock(true)
      return
    }

    ejecutarEmision()
  }

  const ejecutarEmision = async () => {
    setModalAdvertenciaStock(false)
    const nombreFinal = clienteNombre.trim() || 'Consumidor Final'

    if (carrito.length === 0 || emitiendo) {
      setErrorEmision('Agrega productos al carrito para emitir la nota.')
      return
    }

    setEmitiendo(true)
    setErrorEmision(null)

    let finalClienteId = clienteId

    // Si el usuario marcó "Guardar en Directorio" y el cliente no existe aún
    if (guardarEnDirectorio && !finalClienteId && nombreFinal !== 'Consumidor Final') {
      let tipoPorDefecto: TipoCliente = 'general'
      if (tipoSalida === 'promocion') tipoPorDefecto = 'colegio'
      if (tipoSalida === 'consignacion') tipoPorDefecto = 'vendedor'

      const { data: nuevoCliente } = await crearCliente({
        nombre: nombreFinal,
        tipo: tipoPorDefecto,
        contacto: null,
        telefono: null,
      })

      if (nuevoCliente) {
        finalClienteId = nuevoCliente.id
        setClientesLista((prev) => [...prev, nuevoCliente])
      }
    }

    const estadoFlotante: EstadoFlotante = tipoSalida === 'venta' ? 'cerrada' : 'abierta'

    const { error } = await crearNota(
      {
        cliente_id: finalClienteId,
        cliente_nombre: nombreFinal,
        tipo_salida: tipoSalida,
        estado_flotante: estadoFlotante,
        subtotal_usd: subtotal,
        total_usd: subtotal,
        estado: 'pagada', // No suma al saldo si estado_flotante es 'abierta'
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
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Pedidos
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Punto de Venta & Emisión</h2>
          <p className="text-muted-foreground text-sm">
            Emite ventas directas, entregas de muestras a colegios o consignaciones a vendedores.
          </p>
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
        {/* Catálogo de Productos / Libros */}
        <div className="space-y-4 lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar libro por título o SKU..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
            />
          </div>

          {productosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No hay libros en el catálogo que coincidan con la búsqueda.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {productosFiltrados.map((producto) => (
                <Card
                  key={producto.id}
                  className="cursor-pointer transition-all hover:border-primary-accent/40 hover:shadow-xs"
                  onClick={() => agregarProducto(producto)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold text-foreground">{producto.nombre}</p>
                      <span className="mt-1 inline-block rounded-lg bg-muted/80 px-2 py-0.5 font-mono text-[10px] tracking-tight text-muted-foreground">
                        {producto.codigo_sku}
                      </span>
                      <p className="mt-2 font-mono text-sm font-bold text-foreground">
                        {formatPrecio(producto.precio_usd)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className={cn("font-mono text-lg font-bold", producto.stock <= producto.stock_minimo ? "text-amber-600" : "text-foreground")}>
                        {producto.stock}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Ticket / Nota en curso */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border-l-4 border-l-primary-accent shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Nota en Curso
                </span>
                <Badge variant={tipoSalida === 'venta' ? 'pagada' : tipoSalida === 'promocion' ? 'warning' : 'info'}>
                  {tipoSalida === 'venta' ? 'Venta Directa' : tipoSalida === 'promocion' ? 'Muestra / Promoción' : 'Consignación'}
                </Badge>
              </CardTitle>

              {/* Selector de Modalidad */}
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tipo de Operación
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setTipoSalida('venta')}
                    className={cn(
                      'rounded-lg py-1.5 text-xs font-medium transition-all text-center',
                      tipoSalida === 'venta'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Venta
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoSalida('promocion')}
                    className={cn(
                      'rounded-lg py-1.5 text-xs font-medium transition-all text-center',
                      tipoSalida === 'promocion'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Promoción
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoSalida('consignacion')}
                    className={cn(
                      'rounded-lg py-1.5 text-xs font-medium transition-all text-center',
                      tipoSalida === 'consignacion'
                        ? 'bg-foreground text-background shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Consignación
                  </button>
                </div>
              </div>

              {/* Campo de Cliente con Autocompletado Híbrido */}
              <div className="mt-3 relative" ref={wrapperRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Cliente / Receptor
                  </label>
                  {clienteId && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      <Check className="h-2.5 w-2.5" /> Vinculado a Directorio
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => handleClienteInputChange(e.target.value)}
                    onFocus={() => setMostrarSugerencias(true)}
                    placeholder="Escribe el nombre o busca en directorio..."
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 pr-8 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSugerencias(!mostrarSugerencias)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    title="Ver Directorio de Clientes"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                </div>

                {/* Dropdown de Autocompletado del Directorio */}
                {mostrarSugerencias && sugerenciasClientes.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Directorio de Clientes
                    </div>
                    {sugerenciasClientes.map((c) => {
                      const IconComp = c.tipo === 'colegio' ? Building2 : c.tipo === 'vendedor' ? ShoppingBag : User
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => seleccionarClienteDirectorio(c)}
                          className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">{c.nombre}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                            {c.tipo}
                          </Badge>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Opción para guardar en el directorio si es nuevo */}
                {!clienteId && clienteNombre.trim() !== '' && clienteNombre !== 'Consumidor Final' && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={guardarEnDirectorio}
                      onChange={(e) => setGuardarEnDirectorio(e.target.checked)}
                      className="rounded border-border text-primary-accent focus:ring-primary-accent"
                    />
                    <span>Guardar también &quot;{clienteNombre}&quot; en el Directorio</span>
                  </label>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Lista de productos en el ticket */}
              {carrito.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Selecciona libros del catálogo a la izquierda
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
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
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {errorEmision}
                </div>
              )}

              {/* Subtotal */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {tipoSalida === 'venta' ? 'Total a Cobrar' : 'Valor Total de Salida'}
                  </span>
                  <span className="font-mono text-xl font-bold text-foreground">
                    {formatPrecio(subtotal)}
                  </span>
                </div>
                {tipoSalida !== 'venta' && (
                  <p className="mt-1 text-[11px] text-muted-foreground italic">
                    * Salida flotante: Descuenta stock pero no suma a ingresos hasta liquidar/corte.
                  </p>
                )}
              </div>

              <Button
                variant="primary"
                className="w-full"
                disabled={carrito.length === 0 || emitiendo}
                onClick={handleIntentarEmitir}
              >
                {emitiendo
                  ? 'Emitiendo...'
                  : notaEmitida
                    ? '¡Emitida con Éxito! ✓'
                    : tipoSalida === 'venta'
                      ? 'Emitir Venta'
                      : tipoSalida === 'promocion'
                        ? 'Registrar Entrega de Muestra'
                        : 'Registrar Consignación'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Advertencia de Stock Insuficiente */}
      <Modal
        open={modalAdvertenciaStock}
        onClose={() => setModalAdvertenciaStock(false)}
        title="Advertencia: Stock Insuficiente en Bodega"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                Hay productos en tu nota que superan la existencia física disponible:
              </p>
              <p className="text-muted-foreground">
                Si decides continuar, la nota se emitirá y descontará el inventario en el historial (pudiendo reflejar un ajuste posterior).
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Libro</th>
                  <th className="px-2 py-2 text-center font-medium">Solicitado</th>
                  <th className="px-2 py-2 text-center font-medium">En Bodega</th>
                  <th className="px-2 py-2 text-center font-medium text-rose-500">Faltante</th>
                </tr>
              </thead>
              <tbody>
                {itemsInsuficientes.map((item) => (
                  <tr key={item.sku} className="border-t border-border/50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground">{item.nombre}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-foreground">
                      {item.solicitado}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-muted-foreground">
                      {item.disponible}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-rose-600">
                      −{item.solicitado - item.disponible}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setModalAdvertenciaStock(false)}
              disabled={emitiendo}
            >
              Cancelar y Corregir
            </Button>
            <Button
              variant="primary"
              onClick={ejecutarEmision}
              disabled={emitiendo}
            >
              {emitiendo ? 'Emitiendo...' : 'Continuar y Emitir Nota'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barra flotante inferior para pantallas móviles */}
      {carrito.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{carrito.length} títulos en nota</p>
              <p className="font-mono text-lg font-bold">{formatPrecio(subtotal)}</p>
            </div>
            <Button variant="primary" disabled={emitiendo} onClick={handleIntentarEmitir}>
              {emitiendo ? 'Emitiendo...' : 'Emitir Nota'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
