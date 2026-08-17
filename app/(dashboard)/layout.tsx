'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Boxes } from 'lucide-react'
import Sidebar from '@/components/dashboard/sidebar'
import Topbar from '@/components/dashboard/topbar'
import { useAuth } from '@/components/providers/auth-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Guard de autenticación: si no hay sesión activa tras cargar, redirigir a login
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-md animate-pulse">
            <Boxes className="h-6 w-6" />
          </div>
          <p className="text-xs font-mono text-muted-foreground animate-pulse">
            Cargando Invoficlib...
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
      {/* Sidebar - Desktop (Fijo) & Móvil (Drawer deslizable) */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Área de Contenido */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar con trigger de menú móvil */}
        <Topbar onMenuToggle={() => setSidebarOpen(true)} />

        {/* Contenido Principal con fondo minimalista */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background transition-colors duration-300">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
