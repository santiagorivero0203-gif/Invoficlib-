'use client'

import { Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto py-12 text-center">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-foreground border border-border">
          <Clock className="h-8 w-8 text-primary-accent" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Estamos preparando este módulo con el estándar estético y operativo de <strong>Invoficlib</strong>. Estará disponible en la siguiente fase de desarrollo.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/inventario">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Inventario
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
