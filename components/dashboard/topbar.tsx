'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User, DollarSign, Bell, Menu } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTasas } from '@/components/providers/tasas-provider'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface TopbarProps {
  onMenuToggle?: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { tasaUsd, tasaEur } = useTasas()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card/90 backdrop-blur-md px-4 md:px-6 transition-all duration-300 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Botón hamburguesa — solo móvil */}
        <button
          onClick={onMenuToggle}
          className="md:hidden rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Indicador de Tasa del Día - Apple Pill Style */}
        <div className="flex items-center gap-3 rounded-full bg-muted/80 border border-border px-3.5 py-1.5 text-xs text-foreground font-semibold shadow-xs">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary-accent shrink-0" />
            <span className="font-mono tracking-tight">USD: {tasaUsd.toFixed(2)} Bs.</span>
          </div>
          <span className="text-muted-foreground/30 font-normal">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 font-bold shrink-0">€</span>
            <span className="font-mono tracking-tight">EUR: {tasaEur.toFixed(2)} Bs.</span>
          </div>
        </div>
      </div>

      {/* Controles de Usuario y Acciones */}
      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />

        {/* Campana de Notificaciones */}
        <button
          className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-card" />
        </button>

        <div className="hidden sm:block h-5 w-px bg-border mx-1" />

        {/* Perfil del Operador */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground border border-border">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground leading-none">
              {user?.nombre ?? 'Invitado'}
            </p>
            <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
              {user?.rol ?? 'sin sesión'}
            </span>
          </div>
        </div>

        {/* Botón Salir */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/20 transition-all duration-200"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden md:inline font-medium">Salir</span>
        </button>
      </div>
    </header>
  )
}
