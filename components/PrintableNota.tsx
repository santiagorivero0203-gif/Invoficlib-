'use client'

import React from 'react'
import { Printer, X, FileText } from 'lucide-react'
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
  // ── 1. CÁLCULO ESTRICTO DE UNIDADES Y TOTALES ──
  const totalItems = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0)
  const subtotalUsd = items.reduce((acc, item) => acc + (Number(item.totalUsd) || (item.cantidad * item.precioUsd)), 0)
  const totalUsd = subtotalUsd

  /**
   * Abre diálogo nativo de impresión / Guardar como PDF en ventana limpia y aislada.
   */
  const handlePrint = () => {
    const printContent = document.getElementById('printable-nota-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=900,height=750,toolbar=0,menubar=0,scrollbars=1')
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nota-${nota.correlativo.replace('#', '')}</title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              height: 100%;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              padding: 16px 24px;
            }
            @page {
              size: letter portrait;
              margin: 10mm 12mm;
            }
            @media print {
              html, body {
                padding: 0;
                margin: 0;
                height: 100%;
                background: #ffffff !important;
              }
              header, footer, nav { display: none !important; }
            }
            .nota-page-container {
              min-height: 98vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .nota-main-content {
              flex: 1;
            }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; gap: 20px; }
            .grid-cols-3 { grid-template-columns: 2fr 1fr; gap: 12px; }
            .col-span-2 { grid-column: span 2; }
            .items-start { align-items: flex-start; }
            .pb-4 { padding-bottom: 14px; }
            .border-b { border-bottom: 1px solid #cbd5e1; }
            .space-y-1 > * + * { margin-top: 3px; }
            .space-y-1-5 > * + * { margin-top: 5px; }
            .space-y-4 > * + * { margin-top: 14px; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 13px; }
            .text-base { font-size: 15px; }
            .text-xl { font-size: 18px; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: 'Courier New', Courier, monospace; }
            .uppercase { text-transform: uppercase; }
            .tracking-tight { letter-spacing: -0.02em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.15em; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .rounded-lg { border-radius: 6px; }
            .border { border: 1px solid #cbd5e1; }
            .border-t { border-top: 1px solid #cbd5e1; }
            .border-t-2 { border-top: 2px solid #0f172a; }
            .border-y-2 { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
            .p-3 { padding: 10px; }
            .p-3-5 { padding: 12px; }
            .pt-1-5 { padding-top: 6px; }
            .pt-4 { padding-top: 14px; }
            .pt-6 { padding-top: 18px; }
            .mt-6 { margin-top: 18px; }
            .mt-auto { margin-top: auto; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .italic { font-style: italic; }
            .leading-snug { line-height: 1.35; }
            .whitespace-nowrap { white-space: nowrap; }
            .capitalize { text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            th { padding: 6px 10px; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; background-color: #f1f5f9 !important; }
            td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            .nota-footer-section {
              margin-top: auto;
              page-break-inside: avoid;
            }
            .footer-flex {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
            }
          </style>
        </head>
        <body>
          <div class="nota-page-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    printWindow.onload = () => {
      printWindow.print()
      printWindow.close()
    }

    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print()
        printWindow.close()
      }
    }, 500)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      {/* ─── Barra Superior de Acción Única ─── */}
      <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-accent" />
          <span className="font-semibold text-slate-800 text-sm">Comprobante de Entrega</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">
            {nota.correlativo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9 px-3 text-xs">
              <X className="mr-1.5 h-4 w-4" />
              Cerrar
            </Button>
          )}
          
          {/* Botón Único de Impresión / Guardar PDF */}
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="h-9 px-4 text-xs font-semibold shadow-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Guardar PDF
          </Button>
        </div>
      </div>

      {/* ─── HOJA CARTA COMPLETA (Fijación inferior y diseño A4/Letter) ─── */}
      <div
        id="printable-nota-content"
        className="mx-auto max-w-4xl bg-white p-8 sm:p-12 text-slate-900 shadow-md print:max-w-none print:shadow-none print:p-6 print:m-0 print:border-0 font-sans min-h-[960px] flex flex-col justify-between"
      >
        {/* PARTE SUPERIOR: Membrete + Datos de Cliente + Tabla de Productos */}
        <div className="flex-1">
          {/* HEADER: Membrete a la izquierda & Datos del Cliente / Recibo a la derecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-4 border-b border-slate-200">
            
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

            {/* Recuadro Datos del Cliente Derecha (Fondo Claro #f8fafc) */}
            <div className="rounded-lg border border-slate-300 p-3.5 text-xs space-y-1.5 bg-slate-50">
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
                <tr className="border-y-2 border-slate-800 bg-slate-100 text-slate-900 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-20 text-left">Cantidad</th>
                  <th className="py-2.5 px-3 text-left">Descripción</th>
                  <th className="py-2.5 px-3 w-24 text-left font-mono">SKU</th>
                  <th className="py-2.5 px-3 w-28 text-right">Precio USD</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, index) => (
                  <tr key={`${item.sku}-${index}`} className="hover:bg-slate-50">
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
        </div>

        {/* PARTE INFERIOR: Anclada en el fondo de la hoja (mt-auto) */}
        <div className="nota-footer-section mt-auto pt-6 border-t-2 border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            
            {/* Observaciones a la Izquierda (Fondo Claro #f8fafc) */}
            <div className="rounded-lg border border-slate-300 p-3 text-xs bg-slate-50">
              <span className="font-bold text-slate-700 block mb-1">Observaciones:</span>
              <p className="text-slate-800 min-h-[32px] italic">
                {nota.observaciones || 'Sin observaciones registradas.'}
              </p>
            </div>

            {/* Cuadro de Totales a la Derecha (Fondo Claro #f8fafc) */}
            <div className="rounded-lg border border-slate-300 p-3 text-xs space-y-1.5 bg-slate-50">
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

          {/* Pie de Página: QR Code de Verificación & Documento No Fiscal */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            {/* QR Code de Verificación Interna */}
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 bg-white border border-slate-300 p-1 flex items-center justify-center rounded shrink-0">
                <QRCodeDisplay
                  value={nota.id || nota.correlativo}
                  size={48}
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
              <span className="font-bold tracking-widest uppercase text-slate-700 text-xs block">
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
