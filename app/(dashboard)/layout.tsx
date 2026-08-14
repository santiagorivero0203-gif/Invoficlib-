'use client'

import { useState } from 'react'
import Sidebar from '@/components/dashboard/sidebar'
import Topbar from '@/components/dashboard/topbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
