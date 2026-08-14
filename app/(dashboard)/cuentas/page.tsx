'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Package,
  Receipt,
  PiggyBank,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage } from '@/components/ui/error-message'
import { getResumenFinanciero, type ResumenFinanciero } from '@/lib/actions/cuentas'
import { getTasaVigente } from '@/lib/actions/tasa'
import { formatUsd, formatVes } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

export default function CuentasPage() {
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null)
  const [tasaVes, setTasaVes] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setCargando(true)
      setError(null)

      const [resumenResult, tasaResult] = await Promise.all([
        getResumenFinanciero(),
        getTasaVigente(),
      ])

      const err = resumenResult.error ?? tasaResult.error
      if (err) {
        setError(errorMessage(err))
      } else {
        setResumen(resumenResult.data)
        setTasaVes(tasaResult.data?.tasa_ves ?? null)
      }
      setCargando(false)
    })()
  }, [])

  if (cargando) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Resumen Financiero</h2>
          <p className="text-muted-foreground">
            Dashboard gerencial de rentabilidad — período actual.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[20px] bg-muted/60" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !resumen) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Resumen Financiero</h2>
          <p className="text-muted-foreground">
            Dashboard gerencial de rentabilidad — período actual.
          </p>
        </div>
        <ErrorMessage message={error ?? 'No se pudieron cargar los datos financieros.'} />
      </div>
    )
  }

  const vacio =
    resumen.ingresos_usd === 0 &&
    resumen.cogs_usd === 0 &&
    resumen.utilidad_bruta_usd === 0 &&
    resumen.gastos_op_usd === 0 &&
    resumen.utilidad_neta_usd === 0

  if (vacio) {
    return (
      <div className="space-y-6 md:space-y-8 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Resumen Financiero</h2>
          <p className="text-muted-foreground">
            Dashboard gerencial de rentabilidad — período actual.
          </p>
        </div>
        <Card className="p-10">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Aún no hay datos financieros.</p>
            <p className="text-sm text-muted-foreground">
              Registra tu primera venta en /vender.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const margenBrutoPct =
    resumen.ingresos_usd > 0
      ? ((resumen.utilidad_bruta_usd / resumen.ingresos_usd) * 100).toFixed(1)
      : '0.0'

  const metricas = [
    {
      label: 'Ingresos Totales',
      sublabel: 'Ventas netas del período',
      value: resumen.ingresos_usd,
      icon: DollarSign,
      accent: 'border-l-emerald-500',
    },
    {
      label: 'Costo de Mercancía (COGS)',
      sublabel: 'Costo directo de productos vendidos',
      value: resumen.cogs_usd,
      icon: Package,
      accent: 'border-l-rose-500',
    },
    {
      label: 'Utilidad Bruta',
      sublabel: `Margen ${margenBrutoPct}%`,
      value: resumen.utilidad_bruta_usd,
      icon: TrendingUp,
      accent: 'border-l-sky-500',
    },
    {
      label: 'Gastos Operativos',
      sublabel: 'Fijos + variables del mes',
      value: resumen.gastos_op_usd,
      icon: Receipt,
      accent: 'border-l-amber-500',
    },
    {
      label: 'Utilidad Neta',
      sublabel: `Margen neto ${resumen.margen_neto_pct}%`,
      value: resumen.utilidad_neta_usd,
      icon: PiggyBank,
      accent: 'border-l-violet-500',
    },
  ]

  const ingresos = resumen.ingresos_usd
  const segmentos = [
    { label: 'COGS', valor: resumen.cogs_usd, color: 'bg-rose-500', pct: (resumen.cogs_usd / ingresos) * 100 },
    { label: 'Utilidad Bruta', valor: resumen.utilidad_bruta_usd, color: 'bg-sky-500', pct: (resumen.utilidad_bruta_usd / ingresos) * 100 },
    { label: 'Gastos Op.', valor: resumen.gastos_op_usd, color: 'bg-amber-500', pct: (resumen.gastos_op_usd / ingresos) * 100 },
    { label: 'Utilidad Neta', valor: resumen.utilidad_neta_usd, color: 'bg-emerald-500', pct: (resumen.utilidad_neta_usd / ingresos) * 100 },
  ]

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Resumen Financiero</h2>
        <p className="text-muted-foreground">
          Dashboard gerencial de rentabilidad — período actual.
        </p>
      </div>

      {/* Bento Grid financiero */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 md:gap-6">
        {metricas.map((m) => (
          <Card key={m.label} className={cn('border-l-4 p-5', m.accent)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60">
                <m.icon className="h-4 w-4 text-foreground" />
              </div>
            </div>
            <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-foreground">
              {formatUsd(m.value)}
            </p>
            {tasaVes !== null && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {formatVes(m.value, tasaVes)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{m.sublabel}</p>
          </Card>
        ))}
      </div>

      {/* Desglose visual de rentabilidad */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted/60">
              {segmentos.map((seg) => (
                <div
                  key={seg.label}
                  className={cn(seg.color, 'transition-all duration-500')}
                  style={{ width: `${Math.max(0, seg.pct)}%` }}
                  title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="space-y-2">
              {segmentos.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn('h-2.5 w-2.5 rounded-full', seg.color)} />
                    <span className="text-muted-foreground">{seg.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold">{formatUsd(seg.valor)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {seg.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo de Utilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Ingresos', value: resumen.ingresos_usd, sign: '+' },
                { label: '− COGS', value: resumen.cogs_usd, sign: '−' },
                { label: '= Utilidad Bruta', value: resumen.utilidad_bruta_usd, sign: '=', bold: true },
                { label: '− Gastos Operativos', value: resumen.gastos_op_usd, sign: '−' },
                { label: '= Utilidad Neta', value: resumen.utilidad_neta_usd, sign: '=', bold: true, highlight: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    row.highlight ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/30'
                  )}
                >
                  <span className={cn('text-sm', row.bold && 'font-semibold text-foreground')}>
                    {row.label}
                  </span>
                  <span className={cn('font-mono font-semibold tracking-tight', row.bold && 'text-lg')}>
                    {formatUsd(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicador de margen neto — verde si positivo, rojo si negativo */}
      <Card
        className={cn(
          'border-l-4',
          resumen.margen_neto_pct >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'
        )}
      >
        <CardContent className="flex items-center gap-4 p-6">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl',
              resumen.margen_neto_pct >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            )}
          >
            <TrendingUp
              className={cn(
                'h-6 w-6',
                resumen.margen_neto_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {resumen.margen_neto_pct >= 0 ? 'Margen neto saludable' : 'Operando en pérdida'}
            </p>
            <p className="text-sm text-muted-foreground">
              La utilidad neta representa el {resumen.margen_neto_pct}% de los ingresos
              totales después de COGS y gastos operativos.
            </p>
          </div>
          <div
            className={cn(
              'ml-auto hidden font-mono text-3xl font-bold sm:block',
              resumen.margen_neto_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {resumen.margen_neto_pct}%
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
