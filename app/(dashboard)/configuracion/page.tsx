'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  User,
  Save,
  RefreshCw,
  QrCode,
  Printer,
  ExternalLink,
  Smartphone,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { useTasas } from '@/components/providers/tasas-provider'
import { registrarTasa } from '@/lib/actions/tasa'
import { getNotaCompleta, type NotaCompleta, type DetalleNota } from '@/lib/actions/notas'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { QRScanner } from '@/components/scanner/qr-scanner'
import PrintableNota from '@/components/PrintableNota'
import { formatUsd, formatDate } from '@/lib/format'
import { cn, errorMessage } from '@/lib/utils'

const inputClassName = cn(
  'w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground',
  'transition-all duration-200',
  'placeholder:text-muted-foreground',
  'focus:border-primary-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-accent/20'
)

export default function ConfiguracionPage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const { tasaUsd, tasaEur, sincronizando, error: errorTasas, sincronizarAhora } = useTasas()

  const [tasaUsdManual, setTasaUsdManual] = useState('')
  const [tasaEurManual, setTasaEurManual] = useState('')
  const [guardandoTasa, setGuardandoTasa] = useState(false)
  const [mensajeTasa, setMensajeTasa] = useState<string | null>(null)

  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [perfilGuardado, setPerfilGuardado] = useState(false)

  // Estados del Escáner QR de Notas
  const [notaEscaneada, setNotaEscaneada] = useState<NotaCompleta | null>(null)
  const [cargandoNota, setCargandoNota] = useState(false)
  const [errorEscaneo, setErrorEscaneo] = useState<string | null>(null)
  const [modalNotaAbierto, setModalNotaAbierto] = useState(false)
  const [mostrarImpresion, setMostrarImpresion] = useState(false)

  const handleRegistrarTasaManual = async (moneda: 'USD' | 'EUR') => {
    const valorRaw = moneda === 'USD' ? tasaUsdManual : tasaEurManual
    const valor = parseFloat(valorRaw)

    if (isNaN(valor) || valor <= 0) {
      setMensajeTasa('Por favor ingresa un monto válido mayor a 0.')
      return
    }

    setGuardandoTasa(true)
    setMensajeTasa(null)

    const { error } = await registrarTasa(valor, moneda)
    setGuardandoTasa(false)

    if (error) {
      setMensajeTasa(`Error: ${error.message || 'No se pudo guardar'}`)
    } else {
      setMensajeTasa(`Tasa ${moneda} actualizada con éxito a ${valor.toFixed(2)} Bs. ✓`)
      if (moneda === 'USD') setTasaUsdManual('')
      if (moneda === 'EUR') setTasaEurManual('')
      setTimeout(() => setMensajeTasa(null), 3000)
    }
  }

  const handleGuardarPerfil = () => {
    updateProfile({ nombre, email })
    setPerfilGuardado(true)
    setTimeout(() => setPerfilGuardado(false), 2500)
  }

  // Procesar código QR o correlativo escaneado
  const handleScanNota = async (texto: string) => {
    setCargandoNota(true)
    setErrorEscaneo(null)
    setNotaEscaneada(null)

    try {
      let targetId = texto.trim()

      // 1. Si es una URL, extraer ID o parámetro
      if (targetId.includes('/nota/')) {
        const parts = targetId.split('/nota/')
        targetId = parts[1]?.split('?')[0]?.split('/')[0] || targetId
      } else if (targetId.includes('notaId=')) {
        const match = targetId.match(/notaId=([^&]+)/)
        if (match) targetId = match[1]
      }

      const supabase = createClient()
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        targetId
      )

      let idFinal = targetId

      // 2. Si no es UUID, buscar por correlativo
      if (!isUuid) {
        let correlativoBuscado = targetId
        if (!correlativoBuscado.startsWith('#')) {
          correlativoBuscado = `#${correlativoBuscado.padStart(5, '0')}`
        }

        const { data: notaByCorrelativo } = await supabase
          .from('notas')
          .select('id')
          .ilike('correlativo', `%${targetId.replace('#', '')}%`)
          .limit(1)
          .maybeSingle()

        if (notaByCorrelativo) {
          idFinal = notaByCorrelativo.id
        } else {
          throw new Error(`No se encontró ninguna nota con el código o correlativo "${texto}".`)
        }
      }

      // 3. Cargar nota completa y actualizada
      const { data: nota, error } = await getNotaCompleta(idFinal)
      if (error || !nota) {
        throw new Error(`No se pudo obtener la nota (${error ? errorMessage(error) : 'No encontrada'}).`)
      }

      setNotaEscaneada(nota)
      setModalNotaAbierto(true)
    } catch (err) {
      const error = err as Error
      setErrorEscaneo(error.message || 'Error al buscar la nota escaneada.')
    } finally {
      setCargandoNota(false)
    }
  }

  const cantidadDevueltaDe = (nota: NotaCompleta, detalle: DetalleNota): number => {
    return (nota.devoluciones ?? []).reduce((acc, d) => {
      if (d.detalle_nota_id === detalle.id) return acc + d.cantidad_devuelta
      if (d.detalle_nota_id === null && d.producto_id === detalle.producto_id) {
        return acc + d.cantidad_devuelta
      }
      return acc
    }, 0)
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajustes del sistema, tasas oficiales del BCV, lector QR de notas y perfil de usuario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
        {/* Card: Lector de Códigos QR de Notas */}
        <Card className="md:col-span-2 border-primary-accent/20 bg-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-accent/10 text-primary-accent border border-primary-accent/20">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Lector de Códigos QR de Notas</CardTitle>
                  <CardDescription>
                    Escanea notas impresas con la cámara para verificar su estado en tiempo real y gestionarlas.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <QRScanner onScanSuccess={handleScanNota} />

            {cargandoNota && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin text-primary-accent" />
                Buscando nota en el sistema...
              </div>
            )}

            {errorEscaneo && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2">
                <span>{errorEscaneo}</span>
                <Button variant="ghost" size="sm" onClick={() => setErrorEscaneo(null)} className="h-7 text-xs">
                  Cerrar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card: Tasas de Cambio */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                <DollarSign className="h-5 w-5 text-primary-accent" />
              </div>
              <div>
                <CardTitle>Tasa de Cambio Oficial (BCV)</CardTitle>
                <CardDescription>USD / EUR en Bolívares (VES)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Tasas Activas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa Activa USD</span>
                <p className="font-mono text-lg font-bold text-foreground mt-1">{tasaUsd.toFixed(2)} Bs.</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tasa Activa EUR</span>
                <p className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{tasaEur.toFixed(2)} Bs.</p>
              </div>
            </div>

            {/* Registrar USD Manual */}
            <div className="space-y-1.5">
              <label htmlFor="tasa-usd-manual" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sobrescribir Tasa USD Manual
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-muted-foreground">Bs.</span>
                  <input
                    id="tasa-usd-manual"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 42.50"
                    value={tasaUsdManual}
                    onChange={(e) => setTasaUsdManual(e.target.value)}
                    className={cn(inputClassName, 'pl-10 font-mono')}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={() => handleRegistrarTasaManual('USD')}
                  disabled={guardandoTasa}
                >
                  Guardar
                </Button>
              </div>
            </div>

            {/* Registrar EUR Manual */}
            <div className="space-y-1.5">
              <label htmlFor="tasa-eur-manual" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sobrescribir Tasa EUR Manual
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-muted-foreground">Bs.</span>
                  <input
                    id="tasa-eur-manual"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 46.20"
                    value={tasaEurManual}
                    onChange={(e) => setTasaEurManual(e.target.value)}
                    className={cn(inputClassName, 'pl-10 font-mono')}
                  />
                </div>
                <Button 
                  variant="outline"
                  onClick={() => handleRegistrarTasaManual('EUR')}
                  disabled={guardandoTasa}
                >
                  Guardar
                </Button>
              </div>
            </div>

            {mensajeTasa && (
              <p className="text-xs text-center font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg py-1.5">
                {mensajeTasa}
              </p>
            )}

            {errorTasas && (
              <p className="text-xs text-center font-medium text-rose-500 bg-rose-500/10 rounded-lg py-1.5">
                {errorTasas}
              </p>
            )}

            {/* Botón Sincronización Automática */}
            <Button
              variant="primary"
              onClick={sincronizarAhora}
              className="w-full h-10 gap-1.5"
              disabled={sincronizando}
            >
              <RefreshCw className={cn('h-4 w-4', sincronizando && 'animate-spin')} />
              {sincronizando ? 'Sincronizando con BCV...' : 'Sincronizar Tasas Oficiales (BCV)'}
            </Button>
          </CardContent>
        </Card>

        {/* Card: Perfil de Usuario */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground border border-border">
                <User className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle>Perfil de Usuario</CardTitle>
                <CardDescription>
                  Rol activo: <span className="font-semibold capitalize text-foreground">{user?.rol ?? '—'}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="nombre-usuario" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre completo
              </label>
              <input
                id="nombre-usuario"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClassName}
                aria-label="Nombre completo del usuario"
              />
            </div>

            <div>
              <label htmlFor="email-usuario" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Correo electrónico
              </label>
              <input
                id="email-usuario"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(inputClassName, 'font-mono')}
                aria-label="Correo electrónico del usuario"
              />
            </div>

            <Button
              id="btn-guardar-perfil"
              variant="primary"
              onClick={handleGuardarPerfil}
              className="w-full"
              aria-label="Guardar cambios del perfil"
            >
              <Save className="h-4 w-4" />
              {perfilGuardado ? 'Perfil guardado ✓' : 'Guardar Perfil'}
            </Button>
          </CardContent>
        </Card>

        {/* Card: Aplicación Móvil PWA y APK */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-accent/10 text-primary-accent border border-primary-accent/20">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Aplicación Móvil (PWA y Android APK)</CardTitle>
                <CardDescription>
                  Instala Invoficlib en teléfonos Android o iPhone como aplicación nativa con Live Updates.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-foreground">Instalación Directa (PWA)</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Abre <span className="font-mono text-foreground font-semibold">https://invoficlib.vercel.app</span> en Chrome desde cualquier teléfono y presiona <strong>"Instalar aplicación"</strong> en el menú.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <Badge variant="disponible">Live Updates Activo</Badge>
                  <span className="text-[10px] text-muted-foreground">Sesión persistente 24/7</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary-accent shrink-0" />
                  <span className="text-xs font-bold text-foreground">Descargar APK en 1 Clic</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Usa <strong>PWABuilder</strong> de Microsoft para generar el archivo <span className="font-mono text-foreground font-semibold">.apk</span> instalable sin necesidad de tener Android Studio.
                </p>
                <div className="pt-1">
                  <a
                    href="https://www.pwabuilder.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-accent hover:underline"
                  >
                    Abrir PWABuilder Cloud
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal / Detalle de la Nota Escaneada Actualizada */}
      <Modal
        open={modalNotaAbierto}
        onClose={() => setModalNotaAbierto(false)}
        title={notaEscaneada ? `Nota ${notaEscaneada.correlativo}` : 'Nota Escaneada'}
      >
        {notaEscaneada && (
          <div className="space-y-4">
            {/* Header con Estado */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Cliente</p>
                  <p className="font-bold text-foreground text-base mt-0.5">{notaEscaneada.cliente_nombre}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Emitida el {formatDate(notaEscaneada.fecha_creacion)}
                  </p>
                </div>
                <Badge
                  variant={
                    notaEscaneada.estado === 'pagada'
                      ? 'pagada'
                      : notaEscaneada.estado === 'anulada'
                        ? 'anulada'
                        : 'parcial'
                  }
                >
                  {notaEscaneada.estado}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-xs text-muted-foreground">Total de la Nota:</span>
                <span className="font-mono text-base font-bold text-foreground">
                  {formatUsd(notaEscaneada.total_usd)}
                </span>
              </div>
            </div>

            {/* Lista de Libros / Productos */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Productos ({notaEscaneada.detalles_nota.length} líneas)
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {notaEscaneada.detalles_nota.map((det) => {
                  const dev = cantidadDevueltaDe(notaEscaneada, det)
                  return (
                    <div
                      key={det.id}
                      className="rounded-lg border border-border bg-card p-2.5 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {det.productos?.nombre ?? 'Producto'}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {det.cantidad} uds. × {formatUsd(det.precio_unitario_usd)}
                          {dev > 0 && (
                            <span className="ml-1 text-rose-500 font-semibold">(−{dev} devueltas)</span>
                          )}
                        </p>
                      </div>
                      <p className="font-mono font-bold text-foreground shrink-0">
                        {formatUsd(det.subtotal_usd)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setMostrarImpresion(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setModalNotaAbierto(false)
                  router.push(`/pedidos?notaId=${notaEscaneada.id}`)
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Gestionar en Pedidos
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Vista de Impresión */}
      {mostrarImpresion && notaEscaneada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <PrintableNota
            nota={{
              id: notaEscaneada.id,
              correlativo: notaEscaneada.correlativo,
              fecha: formatDate(notaEscaneada.fecha_creacion),
              observaciones: notaEscaneada.observaciones,
              tipoSalida: notaEscaneada.tipo_salida,
            }}
            cliente={{
              nombre: notaEscaneada.cliente_nombre,
              rif: 'J-50410440-0',
              direccion: 'Caracas, Venezuela',
            }}
            items={notaEscaneada.detalles_nota.map((det) => ({
              cantidad: det.cantidad,
              descripcion: det.productos?.nombre || 'Producto',
              sku: det.productos?.codigo_sku || 'S/N',
              precioUsd: det.precio_unitario_usd,
              totalUsd: det.subtotal_usd,
            }))}
            onClose={() => setMostrarImpresion(false)}
          />
        </div>
      )}
    </div>
  )
}

