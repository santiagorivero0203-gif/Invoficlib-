'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Plus,
  ArrowLeft,
  Boxes,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getMovimientos,
  registrarMovimientoManual,
  type MovimientoConProducto,
} from '@/lib/actions/movimientos'
import { getProductosConStock, type ProductoConStock } from '@/lib/actions/productos'
import { formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

interface RegistrosClientProps {
  initialMovimientos: MovimientoConProducto[]
  initialProductos: ProductoConStock[]
  tipoInicial: 'todos' | 'entrada' | 'salida'
}

export default function RegistrosClient({
  initialMovimientos,
  initialProductos,
  tipoInicial,
}: RegistrosClientProps) {
  const [movimientos, setMovimientos] = useState<MovimientoConProducto[]>(initialMovimientos)
  const [productos, setProductos] = useState<ProductoConStock[]>(initialProductos)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'salida'>(tipoInicial)
  const [busqueda, setBusqueda] = useState('')

  // Modal registrar movimiento
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoConStock | null>(
    productos[0] || null
  )
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada')
  const [cantidad, setCantidad] = useState('10')
  const [motivo, setMotivo] = useState('Ingreso de imprenta / proveedor')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const { user } = useAuth()

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    setError(null)

    const [movResult, prodResult] = await Promise.all([
      getMovimientos(filtroTipo === 'todos' ? undefined : filtroTipo),
      getProductosConStock(),
    ])

    if (movResult.error) {
      setError(errorMessage(movResult.error))
    } else {
      setMovimientos((movResult.data as MovimientoConProducto[]) ?? [])
    }

    if (prodResult.data) {
      setProductos(prodResult.data)
      if (!productoSeleccionado && prodResult.data.length > 0) {
        setProductoSeleccionado(prodResult.data[0])
      }
    }

    setCargando(false)
  }, [filtroTipo, productoSeleccionado])

  const handleGuardarMovimiento = async () => {
    const cantNum = parseInt(cantidad, 10)
    if (!productoSeleccionado || isNaN(cantNum) || cantNum <= 0) {
      setErrorModal('Ingresa una cantidad válida mayor a 0.')
      return
    }

    setGuardando(true)
    setErrorModal(null)

    const { error } = await registrarMovimientoManual({
      producto_id: productoSeleccionado.id,
      tipo: tipoMovimiento,
      cantidad: cantNum,
      motivo: motivo.trim() || 'Ajuste manual de almacén',
      usuario_id: user?.id || null,
      nota_id: null,
    })

    setGuardando(false)
    if (error) {
      setErrorModal(errorMessage(error))
      return
    }

    setModalAbierto(false)
    cargarDatos()
  }

  const movimientosFiltrados = movimientos.filter((m) => {
    const sku = m.productos?.codigo_sku?.toLowerCase() ?? ''
    const nombre = m.productos?.nombre?.toLowerCase() ?? ''
    const motivoTexto = m.motivo?.toLowerCase() ?? ''
    const notaRef = m.notas?.correlativo?.toLowerCase() ?? ''
    const q = busqueda.toLowerCase()

    return sku.includes(q) || nombre.includes(q) || motivoTexto.includes(q) || notaRef.includes(q)
  })

  const totalEntradas = movimientos.filter((m) => m.tipo === 'entrada').length
  const totalSalidas = movimientos.filter((m) => m.tipo === 'salida').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/inventario"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Inventario
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
              <History className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Historial de Movimientos</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Auditoría completa de todas las entradas y salidas registradas en el almacén.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalAbierto(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Registrar Movimiento Manual
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Total Movimientos</p>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{movimientos.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Eventos auditados en ledger</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Entradas de Stock</p>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{totalEntradas}</p>
            <p className="mt-1 text-xs text-muted-foreground">Imprenta, compras y devoluciones</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase">Salidas de Stock</p>
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-foreground">{totalSalidas}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ventas, muestras y consignaciones</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setFiltroTipo('todos')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              filtroTipo === 'todos'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todos ({movimientos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('entrada')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              filtroTipo === 'entrada'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Entradas ({totalEntradas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('salida')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              filtroTipo === 'salida'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Salidas ({totalSalidas})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por libro, SKU, motivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-4 text-xs focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {cargando && movimientos.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : movimientosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Boxes className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No hay movimientos registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">SKU</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Libro / Producto</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Cantidad</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Motivo / Operación</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Nota / Ref</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((mov) => {
                    const esEntrada = mov.tipo === 'entrada'
                    return (
                      <tr
                        key={mov.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                          {mov.productos?.codigo_sku ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {mov.productos?.nombre ?? 'Producto Eliminado'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={esEntrada ? 'entrada' : 'salida'}>
                            {esEntrada ? 'Entrada (+)' : 'Salida (-)'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          <span className={esEntrada ? 'text-emerald-600' : 'text-amber-600'}>
                            {esEntrada ? '+' : '−'}
                            {mov.cantidad}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {mov.motivo || 'Movimiento de inventario'}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                          {mov.notas ? (
                            <span className="rounded bg-muted/70 px-1.5 py-0.5">
                              {mov.notas.correlativo} ({mov.notas.cliente_nombre})
                            </span>
                          ) : (
                            'Manual'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {formatDate(mov.fecha_creacion)}
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

      {/* Modal */}
      <Modal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar Movimiento de Inventario"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Libro / Producto <span className="text-rose-500">*</span>
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
                <option value="salida">- Salida</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Cantidad
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="10"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary-accent/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">
              Motivo / Observación
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Lote recibido de imprenta"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary-accent/50 focus:outline-none"
            />
          </div>

          {errorModal && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {errorModal}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardarMovimiento} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
