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
  Download,
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

  // Filtros de búsqueda adicionales
  const [ocultarAgotados, setOcultarAgotados] = useState(false)
  const [mostrarBajoStock, setMostrarBajoStock] = useState(false)
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false)
  const [mostrarPrecio, setMostrarPrecio] = useState(true)

  const limpiarFiltros = () => {
    setOcultarAgotados(false)
    setMostrarBajoStock(false)
    setMostrarUbicacion(false)
    setMostrarPrecio(true)
    setBusqueda('')
  }

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

  const [mensajeExitoModal, setMensajeExitoModal] = useState<string | null>(null)

  const generarSiguienteSku = useCallback(() => {
    const numerosExistentes = productos
      .map((p) => {
        const match = p.codigo_sku.match(/\d+/)
        return match ? parseInt(match[0], 10) : 0
      })
      .filter((n) => !isNaN(n))
    
    const maxNum = numerosExistentes.length > 0 ? Math.max(...numerosExistentes) : 100
    return `LIB-${String(maxNum + 1).padStart(3, '0')}`
  }, [productos])

  const abrirCrearProducto = () => {
    setEditandoId(null)
    setFormProducto({
      codigo_sku: generarSiguienteSku(),
      nombre: '',
      descripcion: '',
      precio_usd: '',
      stock_minimo: '5',
      stock_inicial: '',
    })
    setErrorModalProducto(null)
    setMensajeExitoModal(null)
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
    setMensajeExitoModal(null)
    setModalProductoAbierto(true)
  }

  const handleGuardarProducto = async (crearOtro = false) => {
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
    setMensajeExitoModal(null)

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
      setModalProductoAbierto(false)
      cargarProductos()
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
          usuario_id: user?.id || null,
          nota_id: null,
        })
      }
      setGuardandoProducto(false)

      await cargarProductos()

      if (crearOtro) {
        // Preparar inmediatamente para el siguiente producto sin cerrar el modal
        const match = formProducto.codigo_sku.match(/\d+/)
        const currentNum = match ? parseInt(match[0], 10) : 100
        const nextSku = `LIB-${String(currentNum + 1).padStart(3, '0')}`

        setMensajeExitoModal(`"${formProducto.nombre}" guardado con éxito.`)
        setFormProducto({
          codigo_sku: nextSku,
          nombre: '',
          descripcion: '',
          precio_usd: '',
          stock_minimo: '5',
          stock_inicial: '',
        })
      } else {
        setModalProductoAbierto(false)
      }
    }
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
      usuario_id: user?.id || null,
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

  const productosFiltrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())
    
    if (!coincideTexto) return false
    if (ocultarAgotados && p.stock === 0) return false
    if (mostrarBajoStock && p.stock > p.stock_minimo) return false
    
    return true
  })

  const totalItems = productos.length
  const totalUnidades = productos.reduce((acc, p) => acc + p.stock, 0)
  const productosBajoStock = productos.filter((p) => p.stock <= p.stock_minimo).length
  const valorTotalInventario = productos.reduce((acc, p) => acc + p.stock * p.precio_usd, 0)

  // Exportar catálogo completo valorizado a CSV
  const handleExportarInventarioCSV = () => {
    if (productos.length === 0) return

    const headers = [
      'Codigo SKU',
      'Titulo / Nombre',
      'Descripcion',
      'Stock Actual',
      'Stock Minimo',
      'Precio Unitario USD',
      'Valor Total USD',
      'Estado',
    ]

    const rows = productos.map((p) => [
      p.codigo_sku,
      `"${p.nombre}"`,
      `"${p.descripcion || ''}"`,
      p.stock,
      p.stock_minimo,
      p.precio_usd.toFixed(2),
      (p.stock * p.precio_usd).toFixed(2),
      p.estado ? 'Activo' : 'Inactivo',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inventario_valorizado_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Acciones Principales ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Inventario General
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Catálogo de libros y stock físico disponible en bodega central.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="md" onClick={handleExportarInventarioCSV} className="h-10 px-3.5 rounded-xl text-xs font-semibold">
            <Download className="mr-1.5 h-4 w-4" />
            Exportar CSV
          </Button>
          <Link href="/inventario/registros">
            <Button variant="outline" size="md" className="h-10 px-3.5 rounded-xl text-xs font-semibold">
              <History className="mr-1.5 h-4 w-4" />
              Historial
            </Button>
          </Link>
          <Button variant="outline" size="md" onClick={() => abrirCargarStock()} className="h-10 px-3.5 rounded-xl text-xs font-semibold">
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Entrada de Stock
          </Button>
          <Button variant="primary" size="md" onClick={abrirCrearProducto} className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* ─── Tarjetas de Métricas de Inventario (Grid 2x2 en móvil / 4 cols en desktop) ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {/* Títulos */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-slate-400 to-slate-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Títulos
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalItems}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">Activos en catálogo</p>
          </CardContent>
        </Card>

        {/* Stock Total */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-sky-400 to-sky-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stock Total
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                <Boxes className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{totalUnidades}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">Uds. disponibles</p>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stock Bajo
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{productosBajoStock}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">Por debajo del mínimo</p>
          </CardContent>
        </Card>

        {/* Valor Total */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Valor Total
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-xl md:text-2xl font-bold tracking-tight text-foreground">{formatUsd(valorTotalInventario)}</p>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">Precio USD base</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Grid de Filtros y Tabla ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4 items-start">
        {/* Panel de Filtros a la Izquierda */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <h3 className="font-bold text-sm text-foreground">Filtros de Catálogo</h3>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="text-xs text-primary-accent hover:underline font-semibold"
              >
                Limpiar
              </button>
            </div>
            
            <div className="space-y-3.5">
              <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <span>Ocultar productos agotados</span>
                <input
                  type="checkbox"
                  checked={ocultarAgotados}
                  onChange={(e) => setOcultarAgotados(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-accent focus:ring-primary-accent/30"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <span>Mostrar solo stock bajo</span>
                <input
                  type="checkbox"
                  checked={mostrarBajoStock}
                  onChange={(e) => setMostrarBajoStock(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-accent focus:ring-primary-accent/30"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <span>Mostrar ubicación de almacén</span>
                <input
                  type="checkbox"
                  checked={mostrarUbicacion}
                  onChange={(e) => setMostrarUbicacion(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-accent focus:ring-primary-accent/30"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <span>Mostrar precio de venta</span>
                <input
                  type="checkbox"
                  checked={mostrarPrecio}
                  onChange={(e) => setMostrarPrecio(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary-accent focus:ring-primary-accent/30"
                />
              </label>
            </div>
          </Card>
        </div>

        {/* Tabla y Buscador a la Derecha */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar por título, SKU o autor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs md:text-sm placeholder:text-muted-foreground focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20 transition-all"
            />
          </div>

          {error && <ErrorMessage message={error} />}

          {cargando && productos.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted-foreground/20 border-t-foreground" />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="font-semibold text-foreground">No hay libros registrados en el inventario.</p>
                <p className="text-xs text-muted-foreground mt-1">Crea tu primer producto con el botón superior.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SKU / Código</th>
                      <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Título / Producto</th>
                      {mostrarPrecio && (
                        <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Precio USD</th>
                      )}
                      <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                      <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Valor Total</th>
                      {mostrarUbicacion && (
                        <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ubicación</th>
                      )}
                      <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Mínimo</th>
                      <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {productosFiltrados.map((p) => {
                      const bajo = p.stock <= p.stock_minimo
                      const valorTotal = p.valor_total_usd ?? (p.stock * p.precio_usd)
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3.5 font-mono text-xs font-medium text-foreground">
                            {p.codigo_sku}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-foreground">{p.nombre}</p>
                            {p.descripcion && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{p.descripcion}</p>
                            )}
                          </td>
                          {mostrarPrecio && (
                            <td className="px-4 py-3.5 font-mono font-medium text-foreground">
                              {formatUsd(p.precio_usd)}
                            </td>
                          )}
                          <td className="px-4 py-3.5 font-mono">
                            <div className="flex items-center gap-2">
                              <span className={cn('font-bold text-sm md:text-base', bajo ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
                                {p.stock}
                              </span>
                              {bajo && (
                                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                  Bajo
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3.5 font-mono text-xs text-muted-foreground md:table-cell">
                            {formatUsd(valorTotal)}
                          </td>
                          {mostrarUbicacion && (
                            <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                              Bodega Central (Estante {p.codigo_sku.slice(-2)})
                            </td>
                          )}
                          <td className="hidden px-4 py-3.5 font-mono text-xs text-muted-foreground sm:table-cell">
                            {p.stock_minimo} uds.
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs rounded-lg"
                                onClick={() => abrirCargarStock(p)}
                                title="Entrada / Ajuste de Stock"
                              >
                                <PackagePlus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs rounded-lg"
                                onClick={() => abrirEditarProducto(p)}
                                title="Editar Libro"
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
            </Card>
          )}
        </div>
      </div>

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
              onChange={(e) => setFormProducto({ ...formProducto, descripcion: e.target.value })}
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

          {mensajeExitoModal && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pop-in">
              <span>✓</span>
              <span>{mensajeExitoModal} Listo para registrar el siguiente.</span>
            </div>
          )}

          {errorModalProducto && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
              {errorModalProducto}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalProductoAbierto(false)} disabled={guardandoProducto}>
              Cerrar
            </Button>
            {!editandoId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleGuardarProducto(true)}
                disabled={guardandoProducto}
              >
                {guardandoProducto ? 'Guardando...' : 'Guardar y registrar otro'}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleGuardarProducto(false)}
              disabled={guardandoProducto}
            >
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
