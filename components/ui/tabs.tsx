'use client'

import { cn } from '@/lib/utils'

interface TabsProps {
  tabs: { id: string; label: string }[]
  activeTab?: string
  activeId?: string
  onChange: (id: string) => void
  className?: string
}

/** Pestañas simples para filtros de gastos y categorías. */
export function Tabs({ tabs, activeTab, activeId, onChange, className }: TabsProps) {
  const currentActive = activeTab ?? activeId ?? tabs[0]?.id

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
            currentActive === tab.id
              ? 'bg-foreground text-background shadow-xs'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
