'use client'

import { useState } from 'react'
import { DollarSign, User, Save, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
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

  const [tasaVes, setTasaVes] = useState('42.50')
  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [tasaGuardada, setTasaGuardada] = useState(false)
  const [perfilGuardado, setPerfilGuardado] = useState(false)

  const handleGuardarTasa = () => {
    setTasaGuardada(true)
    setTimeout(() => setTasaGuardada(false), 2500)
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
          Ajustes del sistema y perfil de usuario de Invoficlib
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                <DollarSign className="h-5 w-5 text-primary-accent" />
              </div>
              <div>
                <CardTitle>Tasa de Cambio del Día</CardTitle>
                <CardDescription>USD / VES — Referencia BCV</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="tasa-ves" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1 USD equivale a (VES)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-muted-foreground">
                  Bs.
                </span>
                <input
                  id="tasa-ves"
                  type="number"
                  step="0.01"
                  min="0"
                  value={tasaVes}
                  onChange={(e) => setTasaVes(e.target.value)}
                  className={cn(inputClassName, 'pl-10 font-mono')}
                  aria-label="Tasa de cambio USD a VES"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
              <span className="text-xs text-muted-foreground font-medium">Vista previa en barra superior</span>
              <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                1$ = {parseFloat(tasaVes || '0').toFixed(2)} VES
              </span>
            </div>

            <Button
              id="btn-guardar-tasa"
              variant="primary"
              onClick={handleGuardarTasa}
              className="w-full"
              aria-label="Guardar tasa de cambio"
            >
              <RefreshCw className="h-4 w-4" />
              {tasaGuardada ? 'Tasa actualizada ✓' : 'Actualizar Tasa del Día'}
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
