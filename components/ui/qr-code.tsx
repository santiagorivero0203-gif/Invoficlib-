'use client'

/**
 * components/ui/qr-code.tsx
 * -------------------------------------------------------
 * Componente para generar y mostrar un código QR como
 * imagen data-URL usando la librería `qrcode`.
 * Se renderiza solo en el cliente para evitar problemas
 * de hidratación en SSR.
 * -------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  /** URL o texto a codificar en el QR */
  value: string
  /** Tamaño en píxeles del QR generado */
  size?: number
  /** Clases adicionales para el img */
  className?: string
}

/**
 * Genera un QR code como imagen PNG embebida (data URL).
 * Usa qrcode con nivel de corrección de errores 'M' para
 * equilibrar densidad y robustez al imprimir.
 */
export function QRCodeDisplay({ value, size = 128, className }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    let cancelled = false

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled && mounted.current) setDataUrl(url)
      })
      .catch((err) => {
        console.error('[QRCode] Error generando QR:', err)
      })

    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!dataUrl) {
    // Placeholder mientras carga el QR
    return (
      <div
        className={`bg-muted/50 rounded flex items-center justify-center animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR: ${value}`}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
