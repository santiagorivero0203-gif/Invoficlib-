'use client'

/**
 * app/login/page.tsx
 * -------------------------------------------------------
 * Pantalla de Inicio de Sesión Real de Invoficlib.
 *
 * Características:
 * 1. Conexión directa a Supabase Auth.
 * 2. Sesión persistente a largo plazo (Web y Capacitor).
 * 3. Redirección automática tras autenticación.
 * -------------------------------------------------------
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Boxes, Lock, Mail, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [iniciando, setIniciando] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos.')
      return
    }

    setIniciando(true)
    setErrorMsg(null)

    const { error } = await login(email, password)
    setIniciando(false)

    if (error) {
      setErrorMsg(
        error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos. Verifica tus credenciales.'
          : error.message || 'Error al iniciar sesión.'
      )
    } else {
      router.replace('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-accent text-white shadow-lg animate-pulse">
            <Boxes className="h-6 w-6" />
          </div>
          <p className="text-xs font-medium text-muted-foreground animate-pulse">
            Verificando sesión segura...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-pop-in">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-md">
            <Boxes className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Invoficlib
          </h1>
          <p className="text-xs text-muted-foreground">
            Sistema Administrativo y de Gestión de Inventario
          </p>
        </div>

        {/* Card de Login */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground">Iniciar Sesión</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingresa tus credenciales de acceso para entrar al sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ej: jefe@invoficlib.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    'w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 py-2.5 text-sm text-foreground',
                    'transition-all duration-200 focus:border-primary-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-accent/20'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    'w-full rounded-xl border border-border bg-muted/30 pl-10 pr-4 py-2.5 text-sm text-foreground',
                    'transition-all duration-200 focus:border-primary-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-accent/20'
                  )}
                />
              </div>
            </div>

            {/* Mensaje de Error */}
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Enviar */}
            <Button
              type="submit"
              variant="primary"
              disabled={iniciando}
              className="w-full h-11 text-sm font-semibold gap-2 shadow-sm"
            >
              {iniciando ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Entrar al Sistema'
              )}
            </Button>
          </form>

          {/* Aviso de Sesión Persistente */}
          <div className="rounded-2xl border border-primary-accent/20 bg-primary-accent/5 p-3.5 flex items-start gap-2.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary-accent shrink-0 mt-0.5" />
            <span>
              <strong>Sesión Persistente Activada:</strong> No tendrás que volver a iniciar sesión cada vez que abras la aplicación en este dispositivo o app móvil.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
