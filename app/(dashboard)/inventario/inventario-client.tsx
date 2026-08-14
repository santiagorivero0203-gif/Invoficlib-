'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Pencil,
  BookOpen,
  DollarSign,
  PackagePlus,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getProductosConStock,
  crearProducto,
  actualizarProducto,
  type ProductoConStock,
} from '@/lib/actions/productos'
import { registrarMovimientoManual } from '@/lib/actions/movimientos'
import { formatUsd } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

interface InventarioClientProps {
  initialProductos: ProductoConStock[]
}

export default function InventarioClient({ initialProductos }: InventarioClientProps) {
  const [productos, setProductos] = useState<ProductoConStock[]>(initialProductos)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  // Modal Nuevo/Editar Producto
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formProducto, setFormProducto] = useState({
    codigo_sku: '',
    nombre: '',
    descripcion: '',
    precio_usd: '',
    stock_minimo: '5',
    stock_inicial: '',
  })
  const [guardandoProducto, setGuardandoProducto] = useState(false)
  const [errorModalProducto, setErrorModalProducto] = useState<string | null>(null)

  // Modal Ajuste / Entrada de Stock
  const [modalStockAbierto, setModalStockAbierto] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoConStock | null>(null)
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada')
  const [cantidadAjuste, setCantidadAjuste] = useState('10')
  const [motivoAjuste, setMotivoAjuste] = useState('Ingreso de imprenta / abastecimiento')
  const [guardandoStock, setGuardandoStock] = useState(false)
  const [errorModalStock, setErrorModalStock] = useState<string | null>(null)

  const { user } = useAuth()

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error } = await getProductosConStock()
    if (error) {
      setError(errorMessage(error))
    } else {
      setProductos(data ?? [])
    }
    setCargando(false)
  }, [])

  const abrirCrearProducto = () => {
    setEditandoId(null)
    setFormProducto({
      codigo_sku: `LIB-${Math.floor(100 + Math.random() * 900)}`,
      nombre: '',
      descripcion: '',
      precio_usd: '',
      stock_minimo: '5',
      stock_inicial: '',
    })
    setErrorModalProducto(null)
    setModalProductoAbierto(true)
  }

  const abrirEditarProducto = (p: ProductoConStock) => {
    setEditandoId(p.id)
    setFormProducto({
      codigo_sku: p.codigo_sku,
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio_usd: String(p.precio_usd),
      stock_minimo: String(p.stock_minimo),
      stock_inicial: '',
    })
    setErrorModalProducto(null)
    setModalProductoAbierto(true)
  }

  const handleGuardarProducto = async () => {
    if (!formProducto.nombre.trim() || !formProducto.codigo_sku.trim()) {
      setErrorModalProducto('El nombre y el código SKU son obligatorios.')
      return
    }

    const precioNum = parseFloat(formProducto.precio_usd.replace(',', '.'))
    if (isNaN(precioNum) || precioNum < 0) {
      setErrorModalProducto('Ingresa un precio válido (ej: 12.50 o 15).')
      return
    }

    const stockMinNum = parseInt(formProducto.stock_minimo, 10)
    const stockMinFinal = isNaN(stockMinNum) || stockMinNum < 0 ? 5 : stockMinNum

    const stockIniNum = parseInt(formProducto.stock_inicial, 10)
    const stockIniFinal = isNaN(stockIniNum) || stockIniNum < 0 ? 0 : stockIniNum

    setGuardandoProducto(true)
    setErrorModalProducto(null)

    if (editandoId) {
      const { error } = await actualizarProducto(editandoId, {
        codigo_sku: formProducto.codigo_sku.trim(),
        nombre: formProducto.nombre.trim(),
        descripcion: formProducto.descripcion.trim() || null,
        precio_usd: precioNum,
        stock_minimo: stockMinFinal,
      })
      setGuardandoProducto(false)
      if (error) {
        setErrorModalProducto(errorMessage(error))
        return
      }
    } else {
      const { data: nuevo, error } = await crearProducto({
        codigo_sku: formProducto.codigo_sku.trim(),
        nombre: formProducto.nombre.trim(),
        descripcion: formProducto.descripcion.trim() || null,
        precio_usd: precioNum,
        stock_minimo: stockMinFinal,
        estado: true,
      })

      if (error || !nuevo) {
        setGuardandoProducto(false)
        setErrorModalProducto(errorMessage(error))
        return
      }

      if (stockIniFinal > 0) {
        await registrarMovimientoManual({
          producto_id: nuevo.id,
          tipo: 'entrada',
          cantidad: stockIniFinal,
          motivo: 'Carga inicial de inventario',
          usuario_id: user?.id ?? null,
          nota_id: null,
        })
      }
      setGuardandoProducto(false)
    }

    setModalProductoAbierto(false)
    cargarProductos()
  }

  const abrirCargarStock = (p?: ProductoConStock) => {
    setProductoSeleccionado(p ?? (productos[0] || null))
    setTipoMovimiento('entrada')
    setCantidadAjuste('10')
    setMotivoAjuste('Entrada de almacén / Imprenta')
    setErrorModalStock(null)
    setModalStockAbierto(true)
  }

  const handleGuardarMovimientoStock = async () => {
    const cantNum = parseInt(cantidadAjuste, 10)
    if (!productoSeleccionado || isNaN(cantNum) || cantNum <= 0) {
      setErrorModalStock('Ingresa una cantidad válida mayor a 0.')
      return
    }

    setGuardandoStock(true)
    setErrorModalStock(null)

    const { error } = await registrarMovimientoManual({
      producto_id: productoSeleccionado.id,
      tipo: tipoMovimiento,
      cantidad: cantNum,
      motivo: motivoAjuste.trim() || 'Ajuste manual de stock',
      usuario_id: user?.id ?? null,
      nota_id: null,
    })

    setGuardandoStock(false)
    if (error) {
      setErrorModalStock(errorMessage(error))
      return
    }

    setModalStockAbierto(false)
    cargarProductos()
  }

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalItems = productos.length
  const totalUnidades = productos.reduce((acc, p) => acc + p.stock, 0)
  const productosBajoStock = productos.filter((p) => p.stock <= p.stock_minimo).length
  const valorTotalInventario = productos.reduce((acc, p) => acc + p.stock * p.precio_usd, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
              <Boxes className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Inventario General</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo de libros y stock físico disponible en bodega central.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/inventario/registros">
            <Button variant="outline" size="sm">
              <History className="mr-1.5 h-4 w-4" />
              Historial de Movimientos
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => abrirCargarStock()}>
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Entrada de Stock
          </Button>
          <Button variant="primary" size="sm" onClick={abrirCrearProducto}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Libro / Producto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Títulos / Productos</p>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{totalItems}</p>
            <p className="mt-1 text-xs text-muted-foreground">Activos en catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Stock Total en Bodega</p>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{totalUnidades} uds.</p>
            <p className="mt-1 text-xs text-muted-foreground">Disponibles para venta/muestras</p>
          </CardContent>
        </Card>

        <Card className={cn(productosBajoStock > 0 ? 'border-amber-500/50 bg-amber-500/5' : '')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Stock Bajo</p>
              <AlertTriangle className={cn('h-4 w-4', productosBajoStock > 0 ? 'text-amber-600' : 'text-muted-foreground')} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">{productosBajoStock}</span>
              {productosBajoStock > 0 && <Badge variant="warning">Por reponer</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Por debajo del stock mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Valor del Inventario</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{formatUsd(valorTotalInventario)}</p>
            <p className="mt-1 text-xs text-muted-foreground">A precio de venta actual</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por título, SKU o autor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-xs focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {cargando && productos.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : productosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No hay libros registrados en el inventario.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">SKU / Código</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Título / Producto</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Precio USD</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Stock Disponible</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Mínimo</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map((p) => {
                    const bajo = p.stock <= p.stock_minimo
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                          {p.codigo_sku}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{p.nombre}</p>
                          {p.descripcion && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{p.descripcion}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          {formatUsd(p.precio_usd)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold text-base', bajo ? 'text-amber-600' : 'text-foreground')}>
                              {p.stock}
                            </span>
                            {bajo && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                Bajo
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                          {p.stock_minimo} uds.
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs"
                              onClick={() => abrirCargarStock(p)}
                            >
                              <PackagePlus className="mr-1 h-3.5 w-3.5" />
                              Stock
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => abrirEditarProducto(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Nuevo/Editar */}
      <Modal
        open={modalProductoAbierto}
        onClose={() => setModalProductoAbierto(false)}
        title={editandoId ? 'Editar Libro / Producto' : 'Registrar Nuevo Libro en Inventario'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Código SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formProducto.codigo_sku}
                onChange={(e) => setFormProducto({ ...formProducto, codigo_sku: e.target.value })}
                placeholder="LIB-001"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Precio USD ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formProducto.precio_usd}
                onChange={(e) => setFormProducto({ ...formProducto, precio_usd: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Título / Nombre del Libro <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formProducto.nombre}
              onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
              placeholder="Ej: Matemáticas 1er Grado"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Descripción / Editorial
            </label>
            <input
              type="text"
              value={formProducto.descripcion}
              onChange={(e) => setFormProducto({ ...formProducto, description: e.target.value } as any)}
              placeholder="Ej: Primaria, Tapa blanda"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formProducto.stock_minimo}
                onChange={(e) => setFormProducto({ ...formProducto, stock_minimo: e.target.value })}
                placeholder="5"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
              />
            </div>

            {!editandoId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Stock Inicial (Entrada)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formProducto.stock_inicial}
                  onChange={(e) => setFormProducto({ ...formProducto, stock_inicial: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
                />
              </div>
            )}
          </div>

          {errorModalProducto && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
              {errorModalProducto}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalProductoAbierto(false)} disabled={guardandoProducto}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardarProducto} disabled={guardandoProducto}>
              {guardandoProducto ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Registrar Libro'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Cargar Stock */}
      <Modal
        open={modalStockAbierto}
        onClose={() => setModalStockAbierto(false)}
        title="Registrar Entrada / Ajuste de Stock"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Libro / Producto
            </label>
            <select
              value={productoSeleccionado?.id ?? ''}
              onChange={(e) => {
                const found = productos.find((p) => p.id === e.target.value)
                if (found) setProductoSeleccionado(found)
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo_sku} — {p.nombre} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Tipo de Movimiento
              </label>
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value as 'entrada' | 'salida')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
              >
                <option value="entrada">+ Entrada</option>
                <option value="salida">- Salida / Ajuste</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Cantidad
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cantidadAjuste}
                onChange={(e) => setCantidadAjuste(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Motivo
            </label>
            <input
              type="text"
              value={motivoAjuste}
              onChange={(e) => setMotivoAjuste(e.target.value)}
              placeholder="Ej: Ingreso de imprenta"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
            />
          </div>

          {errorModalStock && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {errorModalStock}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalStockAbierto(false)} disabled={guardandoStock}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardarMovimientoStock} disabled={guardandoStock}>
              {guardandoStock ? 'Registrando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
