import React, { useState } from 'react'
import { Printer, X, Download, RefreshCw, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/ui/qr-code'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

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
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [pdfDescargado, setPdfDescargado] = useState(false)

  // ── 1. CÁLCULO ESTRICTO DE UNIDADES FÍSICAS (BUG FIX PREVENCIÓN) ──
  const totalItems = items.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0)
  const subtotalUsd = items.reduce((acc, item) => acc + (Number(item.totalUsd) || (item.cantidad * item.precioUsd)), 0)
  const totalUsd = subtotalUsd

  /**
   * Genera un archivo PDF vectorial limpio, nítido y ultraligero con jsPDF.
   * Totalmente compatible con navegadores móviles, Android APK y desktop.
   */
  const handleDownloadPdf = async () => {
    setGenerandoPdf(true)
    setPdfDescargado(false)
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let currentY = 20

      // 1. Membrete Empresa
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(15)
      pdf.setTextColor(15, 23, 42) // slate-900
      pdf.text((empresa.nombre || 'T- ESCOLARES').toUpperCase(), margin, currentY)
      currentY += 5

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)
      pdf.setTextColor(71, 85, 105) // slate-600
      if (empresa.ciudad) {
        pdf.text(empresa.ciudad, margin, currentY)
        currentY += 4
      }
      if (empresa.telefono) {
        pdf.text(`Telf: ${empresa.telefono}`, margin, currentY)
        currentY += 4
      }
      if (empresa.rif) {
        pdf.text(`R.I.F: ${empresa.rif}`, margin, currentY)
        currentY += 4
      }

      // 2. Recuadro Datos del Cliente y Recibo (Derecha)
      const boxX = 105
      const boxWidth = pageWidth - margin - boxX
      const boxStartY = 15
      const boxHeight = 28

      pdf.setDrawColor(203, 213, 225) // slate-300
      pdf.setFillColor(248, 250, 252) // slate-50
      pdf.roundedRect(boxX, boxStartY, boxWidth, boxHeight, 2, 2, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(51, 65, 85)
      pdf.text('CLIENTE:', boxX + 3.5, boxStartY + 6)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(15, 23, 42)
      const clienteNombreTrunc = pdf.splitTextToSize(cliente.nombre || 'Consumidor Final', boxWidth - 38)[0]
      pdf.text(clienteNombreTrunc || 'Consumidor Final', boxX + 18, boxStartY + 6)

      pdf.setFont('helvetica', 'bold')
      pdf.text('RECIBO:', boxX + boxWidth - 30, boxStartY + 6)
      pdf.setFont('courier', 'bold')
      pdf.text(nota.correlativo, boxX + boxWidth - 16, boxStartY + 6)

      pdf.setDrawColor(226, 232, 240)
      pdf.line(boxX + 2, boxStartY + 9, boxX + boxWidth - 2, boxStartY + 9)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text('C.I/RIF:', boxX + 3.5, boxStartY + 14)
      pdf.setFont('helvetica', 'normal')
      pdf.text(cliente.rif || 'N/A', boxX + 18, boxStartY + 14)

      pdf.setFont('helvetica', 'bold')
      pdf.text('FECHA:', boxX + boxWidth - 30, boxStartY + 14)
      pdf.setFont('helvetica', 'normal')
      pdf.text(nota.fecha || new Date().toLocaleDateString('es-ES'), boxX + boxWidth - 16, boxStartY + 14)

      pdf.line(boxX + 2, boxStartY + 17, boxX + boxWidth - 2, boxStartY + 17)

      pdf.setFont('helvetica', 'bold')
      pdf.text('DIRECCIÓN:', boxX + 3.5, boxStartY + 22)
      pdf.setFont('helvetica', 'normal')
      const dirTrunc = pdf.splitTextToSize(cliente.direccion || 'Sin dirección registrada', boxWidth - 24)[0]
      pdf.text(dirTrunc || 'Sin dirección', boxX + 22, boxStartY + 22)

      currentY = Math.max(currentY + 6, boxStartY + boxHeight + 8)

      // 3. Tabla de Productos
      const colCant = margin
      const colDesc = margin + 20
      const colSku = margin + 105
      const colPrecio = margin + 140
      const colTotal = pageWidth - margin

      pdf.setFillColor(241, 245, 249) // slate-100
      pdf.rect(margin, currentY, pageWidth - margin * 2, 7, 'F')
      pdf.setDrawColor(15, 23, 42)
      pdf.setLineWidth(0.4)
      pdf.line(margin, currentY, pageWidth - margin, currentY)
      pdf.line(margin, currentY + 7, pageWidth - margin, currentY + 7)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(15, 23, 42)
      pdf.text('CANTIDAD', colCant + 2, currentY + 4.8)
      pdf.text('DESCRIPCIÓN', colDesc, currentY + 4.8)
      pdf.text('SKU', colSku, currentY + 4.8)
      pdf.text('PRECIO USD', colPrecio, currentY + 4.8, { align: 'right' })
      pdf.text('TOTAL USD', colTotal - 2, currentY + 4.8, { align: 'right' })

      currentY += 7

      // Filas de productos
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.2)

      for (const item of items) {
        if (currentY > pageHeight - 45) {
          pdf.addPage()
          currentY = 20
        }

        pdf.setTextColor(51, 65, 85)
        pdf.text(`${item.cantidad} Und.`, colCant + 2, currentY + 5)
        
        pdf.setTextColor(15, 23, 42)
        pdf.setFont('helvetica', 'bold')
        const descLines = pdf.splitTextToSize(item.descripcion, 80)
        pdf.text(descLines[0] || item.descripcion, colDesc, currentY + 5)

        pdf.setFont('courier', 'normal')
        pdf.setTextColor(71, 85, 105)
        pdf.text(item.sku || 'S/C', colSku, currentY + 5)

        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(51, 65, 85)
        pdf.text(item.precioUsd.toFixed(2), colPrecio, currentY + 5, { align: 'right' })

        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(15, 23, 42)
        pdf.text(item.totalUsd.toFixed(2), colTotal - 2, currentY + 5, { align: 'right' })

        currentY += 7
        pdf.line(margin, currentY, pageWidth - margin, currentY)
      }

      currentY += 6

      // 4. Observaciones y Totales
      const botBoxWidth = (pageWidth - margin * 2 - 8) / 2
      const botBoxHeight = 26

      // Cuadro Observaciones
      pdf.setDrawColor(203, 213, 225)
      pdf.setFillColor(248, 250, 252)
      pdf.roundedRect(margin, currentY, botBoxWidth, botBoxHeight, 2, 2, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(51, 65, 85)
      pdf.text('Observaciones:', margin + 4, currentY + 5)

      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(7.5)
      pdf.setTextColor(71, 85, 105)
      const obsLines = pdf.splitTextToSize(nota.observaciones || 'Sin observaciones registradas.', botBoxWidth - 8)
      pdf.text(obsLines.slice(0, 3), margin + 4, currentY + 10)

      // Cuadro Totales
      const totX = margin + botBoxWidth + 8
      pdf.roundedRect(totX, currentY, botBoxWidth, botBoxHeight, 2, 2, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor(71, 85, 105)
      pdf.text('TOTAL DE ÍTEMS:', totX + 4, currentY + 5)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(15, 23, 42)
      pdf.text(`${totalItems} unidades`, totX + botBoxWidth - 4, currentY + 5, { align: 'right' })

      pdf.line(totX + 2, currentY + 8, totX + botBoxWidth - 2, currentY + 8)

      pdf.setFont('helvetica', 'normal')
      pdf.text('SUBTOTAL USD:', totX + 4, currentY + 13.5)
      pdf.setFont('courier', 'bold')
      pdf.text(subtotalUsd.toFixed(2), totX + botBoxWidth - 4, currentY + 13.5, { align: 'right' })

      pdf.line(totX + 2, currentY + 16.5, totX + botBoxWidth - 2, currentY + 16.5)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.text('TOTAL USD:', totX + 4, currentY + 22)
      pdf.setFont('courier', 'bold')
      pdf.setFontSize(10)
      pdf.text(`$${totalUsd.toFixed(2)}`, totX + botBoxWidth - 4, currentY + 22, { align: 'right' })

      currentY += botBoxHeight + 8

      // 5. QR Code y Footer
      try {
        const qrDataUrl = await QRCode.toDataURL(nota.id || nota.correlativo, {
          width: 120,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
        pdf.addImage(qrDataUrl, 'PNG', margin, currentY, 16, 16)
      } catch {
        // Continuar si falla el QR
      }

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(51, 65, 85)
      pdf.text(`Comprobante Oficial ${nota.correlativo}`, margin + 20, currentY + 5)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Documento de control interno no fiscal emitido mediante el sistema Invoficlib.', margin + 20, currentY + 9)
      pdf.text(`Fecha y hora de emisión: ${new Date().toLocaleString('es-ES')}`, margin + 20, currentY + 13)

      // 6. Guardar y disparar descarga
      const filename = `Nota-${nota.correlativo.replace('#', '')}.pdf`
      pdf.save(filename)
      setPdfDescargado(true)
      setTimeout(() => setPdfDescargado(false), 4000)
    } catch (err) {
      console.error('Error generando PDF vectorial:', err)
      // Fallback
      window.print()
    } finally {
      setGenerandoPdf(false)
    }
  }

  /**
   * Abre diálogo nativo de impresión limpia.
   */
  const handlePrint = () => {
    const printContent = document.getElementById('printable-nota-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=900,height=700,toolbar=0,menubar=0,scrollbars=1')
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
          <title></title>
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              background: white;
              color: #0f172a;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              padding: 24px;
            }
            @page {
              size: letter portrait;
              margin: 8mm 10mm;
            }
            @media print {
              html, body {
                padding: 0;
                margin: 0;
              }
              header, footer, nav { display: none !important; }
            }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { padding: 6px 8px; text-align: left; }
            th { font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b; border-bottom: 2px solid #0f172a; }
            td { border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            .text-right { text-align: right; }
            .font-mono { font-family: 'Courier New', Courier, monospace; }
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
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: 1fr 1fr; gap: 16px; }
            .rounded-lg { border-radius: 6px; }
            .border { border: 1px solid #cbd5e1; }
            .p-3 { padding: 10px; }
            .bg-slate-50 { background-color: #f8fafc; }
            .mt-6 { margin-top: 16px; }
            .pt-4 { padding-top: 12px; }
            .footer-qr-container {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #cbd5e1;
              display: flex;
              align-items: center;
              justify-content: space-between;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
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
      {/* Barra de Controles en Pantalla (Oculta al imprimir) */}
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
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9">
              <X className="mr-1.5 h-4 w-4" />
              Cerrar
            </Button>
          )}
          
          {/* Botón Descargar PDF (Nativo Vectorial) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={generandoPdf}
            className="h-9 text-xs gap-1.5 border-slate-300 hover:bg-slate-50 transition-all"
          >
            {generandoPdf ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Generando PDF...
              </>
            ) : pdfDescargado ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">¡PDF Descargado!</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-primary-accent" />
                Descargar PDF Plano
              </>
            )}
          </Button>

          {/* Botón Imprimir Directo */}
          <Button variant="primary" size="sm" onClick={handlePrint} className="h-9">
            <Printer className="mr-1.5 h-4 w-4" />
            Imprimir
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
