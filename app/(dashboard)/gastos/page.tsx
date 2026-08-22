'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Modal } from '@/components/ui/modal'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getGastos,
  getResumenGastos,
  crearGasto,
  marcarGastoPagado,
  type FiltroTipo,
  type FiltroEstado,
} from '@/lib/actions/gastos'
import { formatUsd, formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'
import type { Database } from '@/types/database.types'

type Gasto = Database['public']['Tables']['gastos']['Row']
type GastoTipo = Gasto['tipo']
type GastoEstado = Gasto['estado']

const inputClass =
  'w-full rounded-xl border border-border bg-slate-100/50 px-4 py-2.5 text-sm dark:bg-slate-900/50 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:shadow-[0_0_12px_rgba(217,119,6,0.08)] transition-all'

const formInicial = {
  nombre: '',
  categoria: 'General',
  tipo: 'variable' as GastoTipo,
  monto_usd: '',
  estado: 'pagado' as GastoEstado,
  descripcion: '',
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [resumen, setResumen] = useState({ total: 0, fijos: 0, variables: 0, por_pagar: 0 })
  const [tabTipo, setTabTipo] = useState<FiltroTipo>('todos')
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(formInicial)
  const [guardando, setGuardando] = useState(false)
  const [errorCrear, setErrorCrear] = useState<string | null>(null)
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  const cargarGastos = useCallback(async (tipo: FiltroTipo, estado: FiltroEstado) => {
    const { data, error } = await getGastos(tipo, estado)
    if (error) {
      setError(errorMessage(error))
      return
    }
    setError(null)
    setGastos(data ?? [])
  }, [])

  const cargarResumen = useCallback(async () => {
    const { data } = await getResumenGastos()
    if (data) setResumen(data)
  }, [])

  // Carga inicial: cargando arranca en true, los setState ocurren tras el await.
  useEffect(() => {
    let activo = true
    ;(async () => {
      await Promise.all([cargarGastos('todos', 'todos'), cargarResumen()])
      if (!activo) return
      setCargando(false)
    })()
    return () => {
      activo = false
    }
  }, [cargarGastos, cargarResumen])

  // Filtros reactivos: re-consulta desde el onChange de los Tabs (sin effect).
  const cambiarTipo = (id: string) => {
    setTabTipo(id as FiltroTipo)
    cargarGastos(id as FiltroTipo, filtroEstado)
  }

  const cambiarEstado = (id: string) => {
    setFiltroEstado(id as FiltroEstado)
    cargarGastos(tabTipo, id as FiltroEstado)
  }

  const abrirModal = () => {
    setForm(formInicial)
    setErrorCrear(null)
    setModalAbierto(true)
  }

  const agregarGasto = async () => {
    if (!form.nombre || !form.monto_usd || guardando) return
    setGuardando(true)
    setErrorCrear(null)

    const { error } = await crearGasto({
      nombre: form.nombre,
      categoria: form.categoria,
      tipo: form.tipo,
      monto_usd: parseFloat(form.monto_usd),
      estado: form.estado,
      descripcion: form.descripcion || null,
      fecha: new Date().toISOString(),
    })

    setGuardando(false)
    if (error) {
      setErrorCrear(errorMessage(error))
      return
    }

    setModalAbierto(false)
    await Promise.all([cargarGastos(tabTipo, filtroEstado), cargarResumen()])
  }

  const marcarPagado = async (id: string) => {
    if (marcandoId) return
    setMarcandoId(id)
    const { error } = await marcarGastoPagado(id)
    setMarcandoId(null)
    if (error) {
      setError(errorMessage(error))
      return
    }
    await Promise.all([cargarGastos(tabTipo, filtroEstado), cargarResumen()])
  }

  const metricas = [
    {
      label: 'Total Gastos',
      value: resumen.total,
      gradient: 'from-rose-400 to-rose-500',
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    },
    {
      label: 'Gastos Fijos',
      value: resumen.fijos,
      gradient: 'from-violet-400 to-violet-500',
      iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    },
    {
      label: 'Gastos Variables',
      value: resumen.variables,
      gradient: 'from-sky-400 to-sky-500',
      iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    },
    {
      label: 'Por Pagar',
      value: resumen.por_pagar,
      gradient: 'from-amber-400 to-amber-500',
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    },
  ]

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* ─── Encabezado y Acciones ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Control de Gastos
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              Registro de egresos operativos, administrativos y fijos del negocio.
            </p>
          </div>
        </div>

        <Button variant="primary" size="md" onClick={abrirModal} className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs">
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar Gasto
        </Button>
      </div>

      {/* ─── Métricas Superiores ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {metricas.map((m) => (
          <Card key={m.label} className="relative overflow-hidden">
            <div className={cn('absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r', m.gradient)} />
            <CardContent className="p-4 md:p-5">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </span>
              <p className="mt-2 font-mono text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {formatUsd(m.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Filtros ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { id: 'todos', label: 'Todos' },
            { id: 'fijo', label: 'Fijos' },
            { id: 'variable', label: 'Variables' },
          ]}
          activeTab={tabTipo}
          onChange={cambiarTipo}
        />
        <Tabs
          tabs={[
            { id: 'todos', label: 'Todos los estados' },
            { id: 'pagado', label: 'Pagado' },
            { id: 'por_pagar', label: 'Por Pagar' },
          ]}
          activeTab={filtroEstado}
          onChange={cambiarEstado}
        />
      </div>

      {error && <ErrorMessage message={error} />}

      {/* ─── Listado ─── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Registro de Gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {gastos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{gasto.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {gasto.categoria} · {gasto.tipo} · {formatDate(gasto.fecha)}
                    </p>
                    {gasto.descripcion && (
                      <p className="mt-1 text-xs text-muted-foreground">{gasto.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {gasto.estado === 'por_pagar' && (
                      <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => marcarPagado(gasto.id)}
                        disabled={marcandoId === gasto.id}
                        aria-label={`Marcar como pagado: ${gasto.nombre}`}
                        title="Marcar como pagado"
                      >
                        <Check className={cn('h-4 w-4', marcandoId === gasto.id && 'animate-pulse')} />
                      </Button>
                    )}
                    <Badge variant={gasto.estado === 'pagado' ? 'pagado' : 'por_pagar'}>
                      {gasto.estado === 'pagado' ? 'Pagado' : 'Por Pagar'}
                    </Badge>
                    <span className="font-mono font-semibold tracking-tight text-foreground">
                      {formatUsd(gasto.monto_usd)}
                    </span>
                  </div>
                </div>
              ))}
              {gastos.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No hay gastos que coincidan con los filtros.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal agregar gasto */}
      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)} title="Agregar Gasto">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre</label>
            <input className={inputClass} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoría</label>
              <input className={inputClass} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Monto USD</label>
              <input type="number" step="0.01" className={`${inputClass} font-mono`} value={form.monto_usd} onChange={(e) => setForm({ ...form, monto_usd: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Tipo</label>
              <select className={inputClass} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as GastoTipo })}>
                <option value="fijo">Fijo</option>
                <option value="variable">Variable</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Estado</label>
              <select className={inputClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as GastoEstado })}>
                <option value="pagado">Pagado</option>
                <option value="por_pagar">Por Pagar</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Descripción</label>
            <textarea className={`${inputClass} min-h-[80px]`} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          {errorCrear && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <strong>No se pudo crear el gasto:</strong> {errorCrear}
            </div>
          )}
          <Button variant="primary" className="w-full" disabled={guardando} onClick={agregarGasto}>
            {guardando ? 'Guardando...' : 'Guardar Gasto'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
