'use client'

import { useCallback, useState, useMemo } from 'react'
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

  const [usuarioFiltro, setUsuarioFiltro] = useState<string>('todos')

  // Lista dinámica de responsables de movimientos
  const usuariosDisponibles = useMemo(() => {
    const lista = new Set<string>()
    movimientos.forEach((m) => {
      if (m.perfiles?.nombre_completo) lista.add(m.perfiles.nombre_completo)
    })
    return Array.from(lista)
  }, [movimientos])

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      const sku = m.productos?.codigo_sku?.toLowerCase() ?? ''
      const nombre = m.productos?.nombre?.toLowerCase() ?? ''
      const motivoTexto = m.motivo?.toLowerCase() ?? ''
      const notaRef = m.notas?.correlativo?.toLowerCase() ?? ''
      const usuarioNombre = m.perfiles?.nombre_completo?.toLowerCase() ?? ''
      const q = busqueda.toLowerCase()

      const matchBusqueda =
        !q ||
        sku.includes(q) ||
        nombre.includes(q) ||
        motivoTexto.includes(q) ||
        notaRef.includes(q) ||
        usuarioNombre.includes(q)

      const matchUsuario =
        usuarioFiltro === 'todos' || m.perfiles?.nombre_completo === usuarioFiltro

      return matchBusqueda && matchUsuario
    })
  }, [movimientos, busqueda, usuarioFiltro])

  const totalEntradas = movimientos.filter((m) => m.tipo === 'entrada').length
  const totalSalidas = movimientos.filter((m) => m.tipo === 'salida').length

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Navegación ─── */}
      <div className="space-y-3">
        <Link
          href="/inventario"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Volver a Inventario</span>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Historial de Movimientos
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Auditoría completa de todas las entradas y salidas registradas en el almacén.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setModalAbierto(true)}
            className="h-10 px-4 rounded-xl font-semibold shadow-xs shrink-0"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Registrar Movimiento Manual
          </Button>
        </div>
      </div>

      {/* ─── Tarjetas de Métricas (Stat Cards Armónicas) ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-5">
        {/* Total Movimientos */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-slate-400 to-slate-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Movimientos
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {movimientos.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Eventos auditados en ledger</p>
          </CardContent>
        </Card>

        {/* Entradas */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entradas de Stock
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ArrowDownLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {totalEntradas}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Imprenta, compras y devoluciones</p>
          </CardContent>
        </Card>

        {/* Salidas */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Salidas de Stock
              </span>
              <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {totalSalidas}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Ventas, muestras y consignaciones</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Toolbar de Filtros y Búsqueda (h-10 homogénea) ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFiltroTipo('todos')}
            className={cn(
              'h-full rounded-lg px-3.5 text-xs font-medium transition-all',
              filtroTipo === 'todos'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todos ({movimientos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('entrada')}
            className={cn(
              'h-full rounded-lg px-3.5 text-xs font-medium transition-all',
              filtroTipo === 'entrada'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Entradas ({totalEntradas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroTipo('salida')}
            className={cn(
              'h-full rounded-lg px-3.5 text-xs font-medium transition-all',
              filtroTipo === 'salida'
                ? 'bg-card text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Salidas ({totalSalidas})
          </button>
        </div>

        {/* Selector de Usuario / Responsable */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
          <span className="text-muted-foreground font-semibold">Usuario:</span>
          <select
            value={usuarioFiltro}
            onChange={(e) => setUsuarioFiltro(e.target.value)}
            className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos los usuarios</option>
            {usuariosDisponibles.map((u: string) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por libro, SKU, motivo, usuario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* ─── Tabla de Datos ─── */}
      {cargando && movimientos.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : movimientosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Boxes className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">No hay movimientos registrados.</p>
            <p className="text-xs text-muted-foreground mt-1">Los movimientos de stock aparecerán listados aquí.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SKU</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Libro / Producto</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cantidad</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo / Operación</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Responsable</th>
                  <th className="hidden px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Nota / Ref</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {movimientosFiltrados.map((mov: MovimientoConProducto) => {
                  const esEntrada = mov.tipo === 'entrada'
                  const nombreResponsable = mov.perfiles?.nombre_completo || 'Sistema'
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-foreground">
                        {mov.productos?.codigo_sku ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-foreground">
                        {mov.productos?.nombre ?? 'Producto Eliminado'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={esEntrada ? 'entrada' : 'salida'}>
                          {esEntrada ? 'Entrada (+)' : 'Salida (-)'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold">
                        <span className={esEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {esEntrada ? '+' : '−'}
                          {mov.cantidad}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {mov.motivo || 'Movimiento de inventario'}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-accent" />
                          {nombreResponsable}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 font-mono text-xs text-muted-foreground md:table-cell">
                        {mov.notas ? (
                          <span className="rounded-md bg-muted/70 px-2 py-0.5 font-medium">
                            {mov.notas.correlativo} ({mov.notas.cliente_nombre})
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">Manual</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-muted-foreground">
                        {formatDate(mov.fecha_creacion)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
