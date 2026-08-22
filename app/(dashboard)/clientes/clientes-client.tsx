'use client'

import { useCallback, useState } from 'react'
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  ShoppingBag,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Tabs } from '@/components/ui/tabs'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  type Cliente,
} from '@/lib/actions/clientes'
import { useAuth } from '@/components/providers/auth-provider'
import { formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import type { TipoCliente } from '@/types/database.types'

const tipoClienteConfig: Record<TipoCliente, { label: string; variant: 'info' | 'warning' | 'default'; icon: typeof Building2 }> = {
  colegio:  { label: 'Colegio',   variant: 'info',    icon: Building2 },
  vendedor: { label: 'Vendedor',  variant: 'warning', icon: ShoppingBag },
  general:  { label: 'General',   variant: 'default', icon: User },
}

const tabsFiltro = [
  { id: 'todos', label: 'Todos' },
  { id: 'colegio', label: 'Colegios' },
  { id: 'vendedor', label: 'Vendedores' },
  { id: 'general', label: 'General' },
]

const inputClass =
  'w-full rounded-xl border border-border bg-slate-100/50 px-4 py-2.5 text-sm dark:bg-slate-900/50 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_12px_rgba(217,119,6,0.08)] transition-all'

const formInicial = {
  nombre: '',
  tipo: 'general' as TipoCliente,
  contacto: '',
  telefono: '',
}

interface ClientesClientProps {
  initialClientes: Cliente[]
}

export default function ClientesClient({ initialClientes }: ClientesClientProps) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formInicial)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin' || user?.rol === 'developer'

  const cargarClientes = useCallback(async () => {
    setCargando(true)
    setError(null)
    const tipo = filtroTipo === 'todos' ? undefined : (filtroTipo as TipoCliente)
    const { data, error } = await getClientes(tipo)
    if (error) {
      setError(errorMessage(error))
    } else {
      setClientes(data ?? [])
    }
    setCargando(false)
  }, [filtroTipo])

  const abrirCrear = () => {
    setEditandoId(null)
    setForm(formInicial)
    setErrorModal(null)
    setModalAbierto(true)
  }

  const abrirEditar = (cliente: Cliente) => {
    setEditandoId(cliente.id)
    setForm({
      nombre: cliente.nombre,
      tipo: cliente.tipo,
      contacto: cliente.contacto ?? '',
      telefono: cliente.telefono ?? '',
    })
    setErrorModal(null)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEditandoId(null)
    setForm(formInicial)
    setErrorModal(null)
  }

  const handleGuardar = async () => {
    if (!form.nombre.trim()) {
      setErrorModal('El nombre es obligatorio.')
      return
    }

    setGuardando(true)
    setErrorModal(null)

    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      contacto: form.contacto.trim() || null,
      telefono: form.telefono.trim() || null,
    }

    if (editandoId) {
      const { error } = await actualizarCliente(editandoId, payload)
      if (error) {
        setErrorModal(errorMessage(error))
        setGuardando(false)
        return
      }
    } else {
      const { error } = await crearCliente(payload)
      if (error) {
        setErrorModal(errorMessage(error))
        setGuardando(false)
        return
      }
    }

    setGuardando(false)
    cerrarModal()
    cargarClientes()
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return
    const { error } = await eliminarCliente(id)
    if (error) {
      setError(errorMessage(error))
      return
    }
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.contacto?.toLowerCase().includes(busqueda.toLowerCase()) ?? false) ||
      (c.telefono?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)
  )

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Acciones ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Directorio de Clientes
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Gestiona tu base de colegios, docentes, librerías y consumidores finales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={abrirCrear} className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* ─── Tarjetas de Métricas de Clientes ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-5">
        {(['colegio', 'vendedor', 'general'] as TipoCliente[]).map((tipo) => {
          const config = tipoClienteConfig[tipo]
          const cantidad = clientes.filter((c) => c.tipo === tipo).length
          const IconComp = config.icon
          const gradientClass = tipo === 'colegio' ? 'from-blue-400 to-blue-500' : tipo === 'vendedor' ? 'from-cyan-400 to-cyan-500' : 'from-purple-400 to-purple-500'
          const bgIconClass = tipo === 'colegio' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : tipo === 'vendedor' ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'

          return (
            <Card key={tipo} className="relative overflow-hidden">
              <div className={cn('absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r', gradientClass)} />
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {config.label}s
                  </span>
                  <div className={cn('flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg', bgIconClass)}>
                    <IconComp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                </div>
                <p className="font-mono text-2xl md:text-3xl font-bold tracking-tight text-foreground">{cantidad}</p>
                <p className="mt-1 text-xs text-muted-foreground">Registrados en el sistema</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ─── Toolbar de Filtros y Búsqueda (h-10 homogénea) ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={tabsFiltro}
          activeId={filtroTipo}
          onChange={setFiltroTipo}
        />
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por nombre, contacto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20 transition-all"
          />
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {cargando && clientes.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-foreground" />
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {busqueda
                ? 'No hay clientes que coincidan con la búsqueda.'
                : 'Aún no hay clientes registrados.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Contacto</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Teléfono</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => {
                    const config = tipoClienteConfig[cliente.tipo]
                    const IconComp = config.icon
                    return (
                      <tr
                        key={cliente.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-muted/60 p-2">
                              <IconComp className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{cliente.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{cliente.contacto || '—'}</td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">{cliente.telefono || '—'}</td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{formatDate(cliente.fecha_creacion)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => abrirEditar(cliente)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              aria-label="Editar cliente"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {esAdmin && (
                              <button
                                type="button"
                                onClick={() => handleEliminar(cliente.id)}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                aria-label="Eliminar cliente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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

      {/* Modal crear/editar */}
      <Modal
        open={modalAbierto}
        onClose={cerrarModal}
        title={editandoId ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Colegio San José..."
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tipo de Cliente
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['colegio', 'vendedor', 'general'] as TipoCliente[]).map((tipo) => {
                const config = tipoClienteConfig[tipo]
                const IconComp = config.icon
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm({ ...form, tipo })}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition-all',
                      form.tipo === tipo
                        ? 'border-amber-500/60 bg-amber-500/5 text-foreground shadow-sm'
                        : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                    )}
                  >
                    <IconComp className="h-5 w-5" />
                    <span className="font-medium">{config.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Contacto
            </label>
            <input
              type="text"
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              placeholder="Nombre de contacto"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Teléfono
            </label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="0414-1234567"
              className={inputClass}
            />
          </div>

          {errorModal && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
              {errorModal}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={cerrarModal} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGuardar} disabled={guardando}>
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
