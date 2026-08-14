'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart,
  Boxes,
  Wallet,
  Receipt,
  Settings,
  ChevronDown,
  X,
  Plus,
  ShoppingBag,
  Users,
  GraduationCap,
  Handshake
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/auth-provider'

interface SidebarProps {
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

interface NavSubItem {
  name: string
  href: string
  subItems?: { name: string; href: string }[]
}

interface NavItem {
  name: string
  href?: string
  icon: LucideIcon
  subItems?: NavSubItem[]
}

const navigation: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Vender', 
    href: '/vender', 
    icon: ShoppingBag 
  },
  { 
    name: 'Pedidos', 
    href: '/pedidos', 
    icon: ShoppingCart 
  },
  { 
    name: 'Promociones', 
    href: '/promociones', 
    icon: GraduationCap 
  },
  { 
    name: 'Consignaciones', 
    href: '/consignaciones', 
    icon: Handshake 
  },
  { 
    name: 'Clientes', 
    href: '/clientes', 
    icon: Users 
  },
  { 
    name: 'Inventario', 
    icon: Boxes,
    subItems: [
      { name: 'Inventario', href: '/inventario' },
      { name: 'Servicios', href: '/inventario/servicios' },
      { 
        name: 'Registros', 
        href: '/inventario/registros',
        subItems: [
          { name: 'General', href: '/inventario/registros' },
          { name: 'Entradas', href: '/inventario/registros?tipo=entrada' },
          { name: 'Salidas', href: '/inventario/registros?tipo=salida' }
        ]
      },
      { name: 'Historial de Traslados', href: '/inventario/traslados' }
    ]
  },
  { 
    name: 'Cuentas', 
    href: '/cuentas', 
    icon: Wallet 
  },
  { 
    name: 'Gastos', 
    href: '/gastos', 
    icon: Receipt 
  },
  { 
    name: 'Configuración', 
    href: '/configuracion', 
    icon: Settings 
  },
]

export default function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Inventario': true,
    'Registros': false
  })

  const toggleSection = (name: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  const closeSidebar = () => {
    if (setIsOpen) setIsOpen(false)
  }

  const sidebarContent = (
    <div className="flex h-full w-full flex-col bg-card text-foreground border-r border-border p-5 transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-1 mb-8">
        <Link href="/" className="flex items-center gap-3.5 group" onClick={closeSidebar}>
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-foreground text-background shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-foreground">Invoficlib</h1>
            <span className="text-xs text-muted-foreground font-medium">Sistema de Gestión</span>
          </div>
        </Link>

        {setIsOpen && (
          <button 
            onClick={closeSidebar} 
            className="md:hidden rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Quick Action Button (Stitch Inspiration) */}
      <div className="mb-6">
        <Link
          href="/inventario"
          onClick={closeSidebar}
          className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-2.5 px-4 rounded-xl text-sm font-semibold shadow-xs hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Registro</span>
        </Link>
      </div>

      {/* Navigation Tree */}
      <nav className="flex-1 space-y-2 py-4 pb-24 overflow-y-auto overflow-x-hidden invisible-scrollbar pr-2">
        {navigation.map((item) => {
          // RBAC: Ocultar Cuentas y Gastos a la Secretaria
          if (!esAdmin && (item.name === 'Cuentas' || item.name === 'Gastos')) {
            return null
          }
          
          const hasSubItems = Boolean(item.subItems && item.subItems.length > 0)
          const isSectionExpanded = Boolean(expandedSections[item.name])
          const isActive = item.href 
            ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))
            : item.subItems?.some(sub => pathname.startsWith(sub.href))

          if (hasSubItems) {
            return (
              <div key={item.name} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(item.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group text-left",
                    isActive 
                      ? "text-foreground bg-muted/60 font-semibold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-primary-accent" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isSectionExpanded && "rotate-180 text-foreground"
                  )} />
                </button>

                {/* Submenu Accordion */}
                {isSectionExpanded && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-border/80 ml-5 animate-fade-in">
                    {item.subItems?.map((sub) => {
                      const hasNestedSub = Boolean(sub.subItems && sub.subItems.length > 0)
                      const isNestedExpanded = Boolean(expandedSections[sub.name])
                      const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + '/')

                      if (hasNestedSub) {
                        return (
                          <div key={sub.name} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleSection(sub.name)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left",
                                isSubActive
                                  ? "text-foreground font-semibold bg-muted/40"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                              )}
                            >
                              <span>{sub.name}</span>
                              <ChevronDown className={cn(
                                "h-3.5 w-3.5 transition-transform duration-200",
                                isNestedExpanded && "rotate-180"
                              )} />
                            </button>

                            {isNestedExpanded && (
                              <div className="pl-4 py-1 space-y-1 border-l border-border/60 ml-2">
                                {sub.subItems?.map((nested) => {
                                  const isNestedActive = pathname === nested.href
                                  return (
                                    <Link
                                      key={nested.name}
                                      href={nested.href}
                                      onClick={closeSidebar}
                                      className={cn(
                                        "block px-3 py-1.5 rounded-lg text-xs transition-colors",
                                        isNestedActive
                                          ? "text-primary-accent font-semibold bg-primary-accent/10"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                      )}
                                    >
                                      {nested.name}
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      }

                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={closeSidebar}
                          className={cn(
                            "flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all",
                            isSubActive
                              ? "text-foreground font-semibold bg-muted/60"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          )}
                        >
                          {sub.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href!}
              onClick={closeSidebar}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-foreground text-background font-semibold shadow-xs" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4 transition-transform duration-200 group-hover:scale-105",
                isActive ? "text-background" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer info */}
      <div className="border-t border-border pt-3 mt-auto">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span className="font-mono">v1.2.0</span>
          <span>Invoficlib</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex h-full w-64 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Sidebar Móvil Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-200" 
            onClick={closeSidebar}
          />
          {/* Panel */}
          <div className="relative flex w-64 max-w-xs flex-1 flex-col z-50 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
