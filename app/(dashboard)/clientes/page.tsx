'use client'

/**
 * app/(dashboard)/clientes/page.tsx
 * -------------------------------------------------------
 * Módulo de gestión de clientes (Fase 3).
 * Tabla con filtrado por tipo, búsqueda por nombre,
 * y modal CRUD para crear/editar clientes.
 *
 * RBAC: El botón "Eliminar" solo aparece si el usuario
 * es admin (Jefe). Secretaria puede crear y editar pero
 * no eliminar. La restricción real está en RLS.
 * -------------------------------------------------------
 */

import { useCallback, useEffect, useState } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

// ── Constantes de UI ─────────────────────────────────────

/** Mapeo de tipo de cliente a su label y color para Badges */
const tipoClienteConfig: Record<TipoCliente, { label: string; variant: 'info' | 'warning' | 'default'; icon: typeof Building2 }> = {
  colegio:  { label: 'Colegio',   variant: 'info',    icon: Building2 },
  vendedor: { label: 'Vendedor',  variant: 'warning', icon: ShoppingBag },
  general:  { label: 'General',   variant: 'default', icon: User },
}

/** Tabs de filtrado por tipo */
const tabsFiltro = [
  { id: 'todos', label: 'Todos' },
  { id: 'colegio', label: 'Colegios' },
  { id: 'vendedor', label: 'Vendedores' },
  { id: 'general', label: 'General' },
]

/** Estilo del input del formulario */
const inputClass =
  'w-full rounded-xl border border-border bg-slate-100/50 px-4 py-2.5 text-sm dark:bg-slate-900/50 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_12px_rgba(217,119,6,0.08)] transition-all'

/** Estado inicial del formulario */
const formInicial = {
  nombre: '',
  tipo: 'general' as TipoCliente,
  contacto: '',
  telefono: '',
}

// ── Componente Principal ─────────────────────────────────

export default function ClientesPage() {
  // Estado de datos
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros y búsqueda
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  // Modal CRUD
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formInicial)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)

  // RBAC
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'

  // ── Carga de datos ───────────────────────────────────
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarClientes()
  }, [cargarClientes])

  // Filtrado local por búsqueda de texto
  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.contacto?.toLowerCase().includes(busqueda.toLowerCase()) ?? false) ||
      (c.telefono?.toLowerCase().includes(busqueda.toLowerCase()) ?? false)
  )

  // ── Handlers del modal ───────────────────────────────
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

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h2>
          <p className="text-muted-foreground">
            Gestiona tu base de clientes: colegios, vendedores y público general.
          </p>
        </div>
        <Button variant="primary" onClick={abrirCrear}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Tabs
          tabs={tabsFiltro}
          activeId={filtroTipo}
          onChange={setFiltroTipo}
        />
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por nombre, contacto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary-accent/50 focus:outline-none focus:ring-2 focus:ring-primary-accent/20"
          />
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['colegio', 'vendedor', 'general'] as TipoCliente[]).map((tipo) => {
          const config = tipoClienteConfig[tipo]
          const cantidad = clientes.filter((c) => c.tipo === tipo).length
          const IconComp = config.icon
          return (
            <Card key={tipo}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-muted/60 p-3">
                  <IconComp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}s</p>
                  <p className="text-2xl font-bold text-foreground">{cantidad}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Estado de carga / error */}
      {error && <ErrorMessage message={error} />}

      {cargando ? (
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
        /* Tabla de clientes */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                      Contacto
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                      Teléfono
                    </th>
                    <th className="hidden px-4 py-3 font-medium text-muted-foreground lg:table-cell">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Acciones
                    </th>
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
                            <span className="font-medium text-foreground">
                              {cliente.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {cliente.contacto || '—'}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                          {cliente.telefono || '—'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {formatDate(cliente.fecha_creacion)}
                        </td>
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
                            {/* Solo admin puede eliminar (RBAC) */}
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
          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Colegio San José, Juan López..."
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Tipo */}
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

          {/* Contacto */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Contacto
            </label>
            <input
              type="text"
              value={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.value })}
              placeholder="Nombre de la persona de contacto"
              className={inputClass}
            />
          </div>

          {/* Teléfono */}
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

          {/* Acciones */}
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
