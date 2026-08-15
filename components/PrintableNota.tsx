'use client'

import React from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/ui/qr-code'

export interface PrintableNotaItem {
  cantidad: number
  descripcion: string
  sku: string
  precioUsd: number
  totalUsd: number
}

export interface PrintableNotaProps {
  empresa?: {
    nombre?: string
    ciudad?: string
    telefono?: string
    rif?: string
  }
  cliente: {
    nombre: string
    rif?: string | null
    direccion?: string | null
    telefono?: string | null
  }
  nota: {
    id?: string
    correlativo: string
    fecha: string
    observaciones?: string | null
    tipoSalida?: 'venta' | 'promocion' | 'consignacion'
  }
  items: PrintableNotaItem[]
  onClose?: () => void
}

export default function PrintableNota({
  empresa = {
    nombre: 'T- Escolares',
    ciudad: 'Baruta',
    telefono: '4149156867',
    rif: 'J-50410440-0',
  },
  cliente,
  nota,
  items,
  onClose,
}: PrintableNotaProps) {
  // ── 1. CÁLCULO ESTRICTO DE UNIDADES FÍSICAS (BUG FIX PREVENCIÓN) ──
  const totalItems = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0)
  const subtotalUsd = items.reduce((acc, item) => acc + (Number(item.totalUsd) || (item.cantidad * item.precioUsd)), 0)
  const totalUsd = subtotalUsd

  /**
   * Abre una ventana emergente con solo el HTML de la nota para imprimir.
   * Evita que el sidebar, header y otros elementos de la UI aparezcan en la impresión.
   */
  const handlePrint = () => {
    const printContent = document.getElementById('printable-nota-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=900,height=700,toolbar=0,menubar=0,scrollbars=1')
    if (!printWindow) {
      // Fallback si el navegador bloquea el popup
      window.print()
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nota ${nota.correlativo}</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
              font-size: 12px;
              color: #0f172a;
              background: white;
              padding: 24px;
            }
            @media print {
              body { padding: 0; }
              @page { size: A4; margin: 12mm 15mm; }
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; text-align: left; }
            th { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #e2e8f0; }
            td { border-bottom: 1px solid #f1f5f9; font-size: 11px; }
            .text-right { text-align: right; }
            .font-mono { font-family: 'Courier New', monospace; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-500 { color: #64748b; }
            .text-slate-600 { color: #475569; }
            .text-slate-700 { color: #334155; }
            .text-slate-900 { color: #0f172a; }
            .uppercase { text-transform: uppercase; }
            .tracking-widest { letter-spacing: 0.15em; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .grid-cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .totales { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc; }
            .totales div { display: flex; justify-content: space-between; padding: 4px 0; }
            .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // Esperar a que el DOM cargue antes de imprimir
    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }

    // Fallback si onload no dispara (algunos navegadores)
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print()
        printWindow.close()
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      {/* Barra de Controles en Pantalla (Oculta al imprimir) */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm">Vista Previa de Impresión</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">
            {nota.correlativo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9">
              <X className="mr-1.5 h-4 w-4" />
              Cerrar
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handlePrint} className="h-9">
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir Nota
          </Button>
        </div>
      </div>

      {/* DOCUMENTO IMPRIMIBLE (Hoja A4 / Carta) */}
      <div
        id="printable-nota-content"
        className="mx-auto max-w-4xl bg-white p-8 sm:p-12 text-slate-900 shadow-md print:max-w-none print:shadow-none print:p-6 print:m-0 print:border-0 font-sans"
      >
        
        {/* HEADER: Membrete a la izquierda & Datos del Cliente / Recibo a la derecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-6 border-b border-slate-200">
          
          {/* Membrete Izquierda */}
          <div className="space-y-1 text-xs">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {empresa.nombre}
            </h1>
            <p className="text-slate-600 font-medium">{empresa.ciudad}</p>
            <p className="text-slate-600">
              <span className="font-semibold text-slate-700">Telf:</span> {empresa.telefono}
            </p>
            <p className="text-slate-600">
              <span className="font-semibold text-slate-700">R.I.F:</span> {empresa.rif || 'No especificado'}
            </p>
          </div>

          {/* Recuadro Datos del Cliente Derecha */}
          <div className="rounded-lg border border-slate-300 p-3.5 text-xs space-y-1.5 bg-slate-50/50 print:bg-transparent">
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-1.5">
              <div className="col-span-2">
                <span className="font-bold text-slate-700">CLIENTE:</span>{' '}
                <span className="font-medium text-slate-900">{cliente.nombre}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700">RECIBO:</span>{' '}
                <span className="font-mono font-bold text-slate-900">{nota.correlativo}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-1.5">
              <div>
                <span className="font-bold text-slate-700">C.I/RIF:</span>{' '}
                <span className="font-mono text-slate-900">{cliente.rif || 'N/A'}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-700">FECHA:</span>{' '}
                <span className="font-mono text-slate-900">{nota.fecha}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-700">DIRECCIÓN:</span>{' '}
              <span className="text-slate-800 leading-snug">
                {cliente.direccion || 'Sin dirección registrada'}
              </span>
            </div>
          </div>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="mt-6 overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-800 bg-slate-100/70 text-slate-800 print:bg-slate-100 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3 w-20 text-left">Cantidad</th>
                <th className="py-2.5 px-3 text-left">Descripción</th>
                <th className="py-2.5 px-3 w-24 text-left font-mono">SKU</th>
                <th className="py-2.5 px-3 w-28 text-right">Precio USD</th>
                <th className="py-2.5 px-3 w-28 text-right">Total USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, index) => (
                <tr key={`${item.sku}-${index}`} className="hover:bg-slate-50 print:hover:bg-transparent">
                  <td className="py-2 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                    {item.cantidad} Und.
                  </td>
                  <td className="py-2 px-3 text-slate-900 font-medium capitalize">
                    {item.descripcion}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                    {item.sku}
                  </td>
                  <td className="py-2 px-3 font-mono text-right text-slate-800">
                    {item.precioUsd.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 font-mono text-right font-semibold text-slate-900">
                    {item.totalUsd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER: Resumen Matemático & Observaciones */}
        <div className="mt-6 border-t-2 border-slate-800 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Observaciones a la Izquierda */}
            <div className="rounded-lg border border-slate-300 p-3 text-xs bg-slate-50/50 print:bg-transparent">
              <span className="font-bold text-slate-700 block mb-1">Observaciones:</span>
              <p className="text-slate-800 min-h-[32px] italic">
                {nota.observaciones || 'Sin observaciones registradas.'}
              </p>
            </div>

            {/* Cuadro de Totales a la Derecha */}
            <div className="rounded-lg border border-slate-300 p-3 text-xs space-y-1.5 bg-slate-50/50 print:bg-transparent">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-bold uppercase tracking-wider">Total de Ítems:</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {totalItems} <span className="text-[10px] font-normal text-slate-500">unidades</span>
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5 text-slate-700">
                <span className="font-semibold">SUBTOTAL USD:</span>
                <span className="font-mono text-slate-900">{subtotalUsd.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-300 pt-1.5 text-slate-900">
                <span className="font-bold text-sm">TOTAL USD:</span>
                <span className="font-mono font-bold text-base text-slate-900">${totalUsd.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pie de Página: QR Code de Verificación Interna & Documento No Fiscal */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            {/* QR Code de Verificación Interna */}
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 bg-white border border-slate-300 p-1 flex items-center justify-center rounded shrink-0">
                <QRCodeDisplay
                  value={nota.id || nota.correlativo}
                  size={56}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800 text-[11px]">Verificación: {nota.correlativo}</p>
                <p className="text-[10px] text-slate-500">Invoficlib · Sistema de Gestión</p>
                <p className="text-[9px] text-slate-400">Escanear en Configuración &gt; Lector QR</p>
              </div>
            </div>

            {/* Texto de Control Fiscal */}
            <div className="text-center sm:text-right">
              <span className="font-bold tracking-widest uppercase text-slate-700 text-sm block">
                DOCUMENTO NO FISCAL
              </span>
              <span className="text-[10px] text-slate-400">
                Comprobante interno de entrega / movimiento de inventario
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
