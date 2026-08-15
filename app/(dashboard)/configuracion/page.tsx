'use client'

import { useState } from 'react'
import { DollarSign, User, Save, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTasas } from '@/components/providers/tasas-provider'
import { registrarTasa } from '@/lib/actions/tasa'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const inputClassName = cn(
  'w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground',
  'transition-all duration-200',
  'placeholder:text-muted-foreground',
  'focus:border-primary-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-accent/20'
)

export default function ConfiguracionPage() {
  const { user, updateProfile } = useAuth()
  const { tasaUsd, tasaEur, sincronizando, error: errorTasas, sincronizarAhora } = useTasas()

  const [tasaUsdManual, setTasaUsdManual] = useState('')
  const [tasaEurManual, setTasaEurManual] = useState('')
  const [guardandoTasa, setGuardandoTasa] = useState(false)
  const [mensajeTasa, setMensajeTasa] = useState<string | null>(null)
  
  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [perfilGuardado, setPerfilGuardado] = useState(false)

  const handleRegistrarTasaManual = async (moneda: 'USD' | 'EUR') => {
    const valorRaw = moneda === 'USD' ? tasaUsdManual : tasaEurManual
    const valor = parseFloat(valorRaw)

    if (isNaN(valor) || valor <= 0) {
      setMensajeTasa('Por favor ingresa un monto válido mayor a 0.')
      return
    }

    setGuardandoTasa(true)
    setMensajeTasa(null)

    const { error } = await registrarTasa(valor, moneda)
    setGuardandoTasa(false)

    if (error) {
      setMensajeTasa(`Error: ${(error as any).message || 'No se pudo guardar'}`)
    } else {
      setMensajeTasa(`Tasa ${moneda} actualizada con éxito a ${valor.toFixed(2)} Bs. ✓`)
      if (moneda === 'USD') setTasaUsdManual('')
      if (moneda === 'EUR') setTasaEurManual('')
      setTimeout(() => setMensajeTasa(null), 3000)
    }
  }

  const handleGuardarPerfil = () => {
    updateProfile({ nombre, email })
    setPerfilGuardado(true)
    setTimeout(() => setPerfilGuardado(false), 2500)
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajustes del sistema, tasas oficiales del BCV y perfil de usuario de Invoficlib
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                <DollarSign className="h-5 w-5 text-primary-accent" />
              </div>
              <div>
                <CardTitle>Tasa de Cambio Oficial (BCV)</CardTitle>
                <CardDescription>USD / EUR en Bolívares (VES)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Tasas Activas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa Activa USD</span>
                <p className="font-mono text-lg font-bold text-foreground mt-1">{tasaUsd.toFixed(2)} Bs.</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa Activa EUR</span>
                <p className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{tasaEur.toFixed(2)} Bs.</p>
              </div>
            </div>

            {/* Registrar USD Manual */}
            <div className="space-y-1.5">
              <label htmlFor="tasa-usd-manual" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sobrescribir Tasa USD Manual
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-muted-foreground">Bs.</span>
                  <input
                    id="tasa-usd-manual"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 42.50"
                    value={tasaUsdManual}
                    onChange={(e) => setTasaUsdManual(e.target.value)}
                    className={cn(inputClassName, 'pl-10 font-mono')}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={() => handleRegistrarTasaManual('USD')}
                  disabled={guardandoTasa}
                >
                  Guardar
                </Button>
              </div>
            </div>

            {/* Registrar EUR Manual */}
            <div className="space-y-1.5">
              <label htmlFor="tasa-eur-manual" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sobrescribir Tasa EUR Manual
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-muted-foreground">Bs.</span>
                  <input
                    id="tasa-eur-manual"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 46.20"
                    value={tasaEurManual}
                    onChange={(e) => setTasaEurManual(e.target.value)}
                    className={cn(inputClassName, 'pl-10 font-mono')}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={() => handleRegistrarTasaManual('EUR')}
                  disabled={guardandoTasa}
                >
                  Guardar
                </Button>
              </div>
            </div>

            {mensajeTasa && (
              <p className="text-xs text-center font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg py-1.5">
                {mensajeTasa}
              </p>
            )}

            {errorTasas && (
              <p className="text-xs text-center font-medium text-rose-500 bg-rose-500/10 rounded-lg py-1.5">
                {errorTasas}
              </p>
            )}

            {/* Botón Sincronización Automática */}
            <Button
              variant="primary"
              onClick={sincronizarAhora}
              className="w-full h-10 gap-1.5"
              disabled={sincronizando}
            >
              <RefreshCw className={cn('h-4 w-4', sincronizando && 'animate-spin')} />
              {sincronizando ? 'Sincronizando con BCV...' : 'Sincronizar Tasas Oficiales (BCV)'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                <User className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle>Perfil de Usuario</CardTitle>
                <CardDescription>
                  Rol activo: <span className="font-semibold capitalize text-foreground">{user?.rol ?? '—'}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="nombre-usuario" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre completo
              </label>
              <input
                id="nombre-usuario"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClassName}
                aria-label="Nombre completo del usuario"
              />
            </div>

            <div>
              <label htmlFor="email-usuario" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Correo electrónico
              </label>
              <input
                id="email-usuario"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(inputClassName, 'font-mono')}
                aria-label="Correo electrónico del usuario"
              />
            </div>

            <Button
              id="btn-guardar-perfil"
              variant="primary"
              onClick={handleGuardarPerfil}
              className="w-full"
              aria-label="Guardar cambios del perfil"
            >
              <Save className="h-4 w-4" />
              {perfilGuardado ? 'Perfil guardado ✓' : 'Guardar Perfil'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
