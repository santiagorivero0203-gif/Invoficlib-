'use client'

/**
 * components/scanner/qr-scanner.tsx
 * -------------------------------------------------------
 * Componente interactivo de escáner QR dentro de la aplicación.
 *
 * Soporta:
 * 1. Escaneo en vivo mediante cámara / webcam (html5-qrcode).
 * 2. Carga de archivo de imagen con QR.
 * 3. Búsqueda manual por correlativo (#00001) o ID.
 * -------------------------------------------------------
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CameraOff, Upload, Search, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  className?: string
}

export function QRScanner({ onScanSuccess, className }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [codigoManual, setCodigoManual] = useState('')
  const [modo, setModo] = useState<'camara' | 'archivo' | 'manual'>('camara')
  const [procesandoArchivo, setProcesandoArchivo] = useState(false)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const readerElementId = 'invoficlib-qr-reader'

  // Limpiar instancia al desmontar
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop()
      } catch (err) {
        console.error('Error deteniendo escáner:', err)
      }
    }
    setIsScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  // Iniciar escaneo en vivo
  const startScanner = async () => {
    setScannerError(null)
    try {
      if (cameras.length === 0) {
        const devices = await Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          setCameras(devices)
          const backCamera = devices.find((d) =>
            d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera')
          )
          setSelectedCamera(backCamera ? backCamera.id : devices[0].id)
        }
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        })
      }

      const cameraId = selectedCamera || { facingMode: 'environment' }

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          stopScanner()
          onScanSuccess(decodedText)
        },
        () => {}
      )
      setIsScanning(true)
    } catch (err) {
      const error = err as Error
      setScannerError(
        error.message || 'No se pudo iniciar la cámara. Verifica los permisos del navegador.'
      )
      setIsScanning(false)
    }
  }

  // Procesar archivo de imagen
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcesandoArchivo(true)
    setScannerError(null)

    try {
      const html5QrCode = new Html5Qrcode('invoficlib-qr-file-reader')
      const result = await html5QrCode.scanFile(file, true)
      html5QrCode.clear()
      setProcesandoArchivo(false)
      onScanSuccess(result)
    } catch {
      setProcesandoArchivo(false)
      setScannerError('No se detectó un código QR válido en la imagen seleccionada.')
    }
  }

  // Procesar código manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoManual.trim()) return
    onScanSuccess(codigoManual.trim())
  }

  return (
    <div className={cn('space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs', className)}>
      {/* Selector de modo */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant={modo === 'camara' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setModo('camara')}
            className="gap-1.5"
          >
            <Camera className="h-3.5 w-3.5" />
            Cámara
          </Button>
          <Button
            variant={modo === 'archivo' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setModo('archivo')}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Subir Imagen
          </Button>
          <Button
            variant={modo === 'manual' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setModo('manual')}
            className="gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            Código Manual
          </Button>
        </div>
      </div>

      {/* Modo Cámara */}
      {modo === 'camara' && (
        <div className="space-y-3">
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="select-camera" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Cámara:
              </label>
              <select
                id="select-camera"
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value)
                  if (isScanning) {
                    stopScanner().then(() => startScanner())
                  }
                }}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs text-foreground focus:outline-none"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Cámara ${cam.id.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visor de Video */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-slate-950 flex flex-col items-center justify-center min-h-[260px]">
            <div id={readerElementId} className="w-full max-w-[340px] overflow-hidden" />
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-950/90 text-slate-200">
                <Camera className="h-10 w-10 text-muted-foreground opacity-60" />
                <p className="text-xs text-muted-foreground max-w-[240px]">
                  Enfoca el código QR impreso en la nota para abrirla y gestionarla en tiempo real.
                </p>
                <Button variant="primary" size="sm" onClick={startScanner} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Activar Cámara
                </Button>
              </div>
            )}
          </div>

          {isScanning && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={stopScanner} className="gap-1.5 text-rose-500 hover:text-rose-600">
                <CameraOff className="h-4 w-4" />
                Detener Cámara
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modo Archivo */}
      {modo === 'archivo' && (
        <div className="space-y-3">
          <div id="invoficlib-qr-file-reader" className="hidden" />
          <label className="flex flex-col items-center justify-center min-h-[180px] rounded-xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/30 cursor-pointer p-6 transition-all text-center">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm font-semibold text-foreground">Seleccionar imagen o foto con QR</span>
            <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP de la nota impresa</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={procesandoArchivo}
            />
          </label>
          {procesandoArchivo && (
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" /> Procesando imagen...
            </p>
          )}
        </div>
      )}

      {/* Modo Manual */}
      {modo === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label htmlFor="codigo-manual-input" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Correlativo o Código de Nota
            </label>
            <div className="flex gap-2">
              <input
                id="codigo-manual-input"
                type="text"
                placeholder="Ej: #00004 o UUID de la nota"
                value={codigoManual}
                onChange={(e) => setCodigoManual(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2 text-sm font-mono text-foreground focus:border-primary-accent focus:outline-none"
              />
              <Button variant="primary" size="sm" type="submit">
                Buscar
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ingresa el correlativo visible en la parte superior derecha de la nota física.
          </p>
        </form>
      )}

      {/* Errores */}
      {scannerError && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{scannerError}</span>
        </div>
      )}
    </div>
  )
}
