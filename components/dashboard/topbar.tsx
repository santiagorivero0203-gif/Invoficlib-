'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LogOut,
  User,
  Menu,
  Boxes,
  DollarSign,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTasas } from '@/components/providers/tasas-provider'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface TopbarProps {
  onMenuToggle?: () => void
}

const RUTAS_MAP: Record<string, { seccion: string; pagina: string }> = {
  '/': { seccion: 'Inicio', pagina: 'Panel de Control' },
  '/vender': { seccion: 'Ventas', pagina: 'Punto de Venta' },
  '/pedidos': { seccion: 'Ventas', pagina: 'Pedidos y Facturación' },
  '/promociones': { seccion: 'Ventas', pagina: 'Promociones' },
  '/consignaciones': { seccion: 'Ventas', pagina: 'Consignaciones' },
  '/clientes': { seccion: 'Contactos', pagina: 'Directorio de Clientes' },
  '/inventario': { seccion: 'Almacén', pagina: 'Inventario de Productos' },
  '/inventario/registros': { seccion: 'Almacén', pagina: 'Historial de Movimientos' },
  '/inventario/servicios': { seccion: 'Almacén', pagina: 'Servicios' },
  '/inventario/traslados': { seccion: 'Almacén', pagina: 'Historial de Traslados' },
  '/cuentas': { seccion: 'Finanzas', pagina: 'Resumen Financiero' },
  '/gastos': { seccion: 'Finanzas', pagina: 'Control de Gastos' },
  '/resumen-financiero/utilidad-perdida': { seccion: 'Finanzas', pagina: 'Utilidad y Pérdida' },
  '/resumen-financiero/reportes': { seccion: 'Finanzas', pagina: 'Reportes Detallados' },
  '/configuracion': { seccion: 'Sistema', pagina: 'Configuración' },
}

/**
 * Topbar Adaptativo de Invoficlib:
 * - En Móvil: Ultra-limpio (Hamburguesa + Logo + Toggle + Avatar).
 * - En Desktop: Profesional y balanceado (Migas de pan + Tasas en vivo + Usuario + Logout).
 */
export default function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { tasaUsd, tasaEur } = useTasas()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  // Resolver migas de pan según la ruta actual
  const infoRuta = RUTAS_MAP[pathname] || {
    seccion: 'Sistema',
    pagina: pathname.startsWith('/nota/') ? 'Detalle de Comprobante' : 'Invoficlib',
  }

  return (
    <header className="flex h-14 md:h-16 w-full items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-3.5 md:px-6 sticky top-0 z-40 transition-colors">
      {/* ─── LADO IZQUIERDO ─── */}
      <div className="flex items-center gap-3">
        {/* Móvil: Botón hamburguesa */}
        <button
          onClick={onMenuToggle}
          className="md:hidden rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Móvil: Logo e Isotipo */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-accent text-white shadow-xs">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">Invoficlib</span>
        </div>

        {/* Desktop: Migas de pan (Breadcrumb) contextual */}
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {infoRuta.seccion}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-sm font-semibold text-foreground tracking-tight">
            {infoRuta.pagina}
          </span>
        </nav>
      </div>

      {/* ─── LADO DERECHO ─── */}
      <div className="flex items-center gap-2 md:gap-3.5">
        {/* Desktop: Pastilla de Tasas Oficiales en Vivo */}
        <div className="hidden lg:flex items-center gap-3 rounded-full bg-muted/60 border border-border px-3.5 py-1.5 text-xs text-foreground font-semibold shadow-2xs">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-mono tracking-tight font-bold">
              USD: {tasaUsd > 0 ? tasaUsd.toFixed(2) : '—'} <span className="text-[10px] font-normal text-muted-foreground">Bs.</span>
            </span>
          </div>
          <span className="text-border font-normal">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500 font-bold text-xs shrink-0">€</span>
            <span className="font-mono tracking-tight font-bold">
              EUR: {tasaEur > 0 ? tasaEur.toFixed(2) : '—'} <span className="text-[10px] font-normal text-muted-foreground">Bs.</span>
            </span>
          </div>
        </div>

        {/* Separador Desktop */}
        <div className="hidden lg:block h-5 w-px bg-border/80" />

        {/* Theme Toggle (Móvil y Desktop) */}
        <ThemeToggle />

        {/* Desktop: Perfil con Nombre y Rol */}
        <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/30 px-2.5 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background font-bold text-xs">
            {user?.nombre ? user.nombre.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
          </div>
          <div className="text-left pr-1">
            <p className="text-xs font-semibold text-foreground leading-tight">
              {user?.nombre ?? 'Usuario'}
            </p>
            <span className="text-[10px] text-muted-foreground capitalize font-medium">
              {user?.rol ?? 'operador'}
            </span>
          </div>
        </div>

        {/* Desktop: Botón Salir */}
        <button
          onClick={handleLogout}
          className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/20 transition-all"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="font-medium">Salir</span>
        </button>

        {/* Móvil: Botón Avatar que ejecuta Logout */}
        <button
          onClick={handleLogout}
          className="sm:hidden flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground border border-border"
          aria-label="Cerrar sesión"
          title={`${user?.nombre ?? 'Usuario'} · Cerrar sesión`}
        >
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
