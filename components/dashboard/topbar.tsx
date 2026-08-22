'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User, Menu, Boxes } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface TopbarProps {
  onMenuToggle?: () => void
}

/**
 * Topbar simplificada para móvil.
 * Solo muestra: hamburguesa + logo + toggle tema + avatar con logout.
 * Las tasas USD/EUR se muestran en el dashboard como información contextual.
 */
export default function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="flex h-12 md:h-14 w-full items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-3 md:px-5 sticky top-0 z-40">
      {/* Izquierda: hamburguesa + logo */}
      <div className="flex items-center gap-2.5">
        {/* Botón hamburguesa — solo móvil */}
        <button
          onClick={onMenuToggle}
          className="md:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo compacto */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-accent text-white">
            <Boxes className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground hidden sm:block">Invoficlib</span>
        </div>
      </div>

      {/* Derecha: toggle tema + avatar/logout */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />

        {/* Avatar + Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Cerrar sesión"
          title={`${user?.nombre ?? 'Invitado'} · Cerrar sesión`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-foreground border border-border">
            <User className="h-3.5 w-3.5" />
          </div>
          <LogOut className="h-3.5 w-3.5 hidden sm:block" />
        </button>
      </div>
    </header>
  )
}
