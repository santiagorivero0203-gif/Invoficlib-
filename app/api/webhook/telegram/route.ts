/**
 * app/api/webhook/telegram/route.ts
 * -------------------------------------------------------
 * Webhook Serverless en Next.js para el Bot de Telegram
 * asistido por Google Gemini IA.
 *
 * Permite recibir comandos en lenguaje natural del Jefe,
 * interpretarlos con Gemini y responder con datos del Ledger
 * de Supabase en tiempo real.
 * -------------------------------------------------------
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://libcjbesfttwgmigpkot.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface GeminiIntent {
  intent: 'CONSULTA_STOCK' | 'FACTURACION_HOY' | 'ULTIMAS_NOTAS' | 'RESUMEN_GENERAL' | 'AYUDA' | 'DESCONOCIDO'
  query?: string
}

async function parseIntentWithGemini(userText: string): Promise<GeminiIntent> {
  if (!GEMINI_API_KEY) {
    const lower = userText.toLowerCase()
    if (lower.includes('stock') || lower.includes('inventario') || lower.includes('libro') || lower.includes('tienes')) {
      return { intent: 'CONSULTA_STOCK', query: userText.replace(/cuanto|stock|de|hay|tienes/gi, '').trim() }
    }
    if (lower.includes('factura') || lower.includes('venta') || lower.includes('hoy') || lower.includes('dia') || lower.includes('cuanto se vendio')) {
      return { intent: 'FACTURACION_HOY' }
    }
    if (lower.includes('nota') || lower.includes('ultimas') || lower.includes('recientes')) {
      return { intent: 'ULTIMAS_NOTAS' }
    }
    return { intent: 'RESUMEN_GENERAL' }
  }

  const systemInstruction = `Eres el asistente administrativo de Invoficlib. Tu trabajo es interpretar el mensaje del usuario y convertirlo en un comando estructurado JSON estricto.
Opciones de intent:
- "CONSULTA_STOCK": Cuando el usuario pregunta por disponibilidad, inventario, existencia o precio de libros/productos o un SKU. Extrae el nombre o SKU en el campo "query".
- "FACTURACION_HOY": Cuando el usuario pregunta cuánto se ha vendido hoy, facturación del día, ingresos del día o total de ventas de hoy.
- "ULTIMAS_NOTAS": Cuando el usuario pide ver las últimas notas, pedidos recientes, movimientos de notas, promociones o consignaciones emitidas.
- "RESUMEN_GENERAL": Cuando el usuario pide un resumen general del negocio o balance.
- "AYUDA": Cuando el usuario saluda o pide ayuda de comandos.

Responde ÚNICAMENTE un objeto JSON válido con la estructura: {"intent": "...", "query": "..."}`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemInstruction}\n\nMensaje del usuario: "${userText}"` },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    })

    const data = await response.json()
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (rawJson) {
      return JSON.parse(rawJson) as GeminiIntent
    }
  } catch (err) {
    console.error('Error parseando con Gemini:', err)
  }

  return { intent: 'DESCONOCIDO' }
}

async function handleConsultaStock(queryText?: string): Promise<string> {
  const searchTerm = queryText?.trim() || ''
  let dbQuery = supabase
    .from('stock_actual')
    .select('codigo_sku, nombre, stock, precio_usd, valor_total_usd')
    .limit(8)

  if (searchTerm) {
    dbQuery = dbQuery.or(`nombre.ilike.%${searchTerm}%,codigo_sku.ilike.%${searchTerm}%`)
  }

  const { data, error } = await dbQuery

  if (error || !data || data.length === 0) {
    return `📦 *Inventario / Stock:*\nNo se encontraron productos que coincidan con *"${searchTerm || 'todos'}"*.`
  }

  let respuesta = `📦 *Consulta de Stock en Bodega:*\n\n`
  data.forEach((p) => {
    const alerta = p.stock <= 5 ? '⚠️ *STOCK BAJO*' : '✅'
    respuesta += `📖 *${p.nombre}*\n`
    respuesta += `   • SKU: \`${p.codigo_sku}\`\n`
    respuesta += `   • Stock: *${p.stock} unidades* ${alerta}\n`
    respuesta += `   • Precio: $${Number(p.precio_usd).toFixed(2)} | Valor: $${Number(p.valor_total_usd).toFixed(2)}\n\n`
  })

  return respuesta
}

async function handleFacturacionHoy(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('notas')
    .select('total_usd, estado')
    .eq('tipo_salida', 'venta')
    .neq('estado', 'anulada')
    .gte('fecha_creacion', `${today}T00:00:00.000Z`)
    .lte('fecha_creacion', `${today}T23:59:59.999Z`)

  if (error) {
    return `❌ Error al consultar la facturación: ${error.message}`
  }

  const totalFacturado = (data ?? []).reduce((acc, n) => acc + (Number(n.total_usd) || 0), 0)
  const cantidadOrdenes = data?.length ?? 0

  return `💰 *Facturación del Día (${today}):*\n\n` +
    `• *Total Vendido:* $${totalFacturado.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD\n` +
    `• *Órdenes de Venta:* ${cantidadOrdenes} pedidos\n` +
    `• *Estado:* Facturación consolidada en tiempo real.`
}

async function handleUltimasNotas(): Promise<string> {
  const { data, error } = await supabase
    .from('notas')
    .select('correlativo, cliente_nombre, total_usd, tipo_salida, estado, estado_flotante, fecha_creacion')
    .order('fecha_creacion', { ascending: false })
    .limit(6)

  if (error || !data || data.length === 0) {
    return `📄 *Últimas Notas:*\nNo hay notas registradas en el sistema.`
  }

  const ventas = data.filter((n) => n.tipo_salida === 'venta')
  const promociones = data.filter((n) => n.tipo_salida === 'promocion')
  const consignaciones = data.filter((n) => n.tipo_salida === 'consignacion')

  let respuesta = `📋 *Últimas Notas Registradas en Invoficlib:*\n\n`

  if (ventas.length > 0) {
    respuesta += `🏷️ *VENTAS:*\n`
    ventas.forEach((v) => {
      const fecha = new Date(v.fecha_creacion).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      respuesta += `• \`${v.correlativo}\` — *${v.cliente_nombre}* | $${Number(v.total_usd).toFixed(2)} (${v.estado.toUpperCase()}) - ${fecha}\n`
    })
    respuesta += `\n`
  }

  if (promociones.length > 0) {
    respuesta += `🎓 *PROMOCIONES (MUESTRAS / FLOTANTES):*\n`
    promociones.forEach((p) => {
      const fecha = new Date(p.fecha_creacion).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      respuesta += `• \`${p.correlativo}\` — *${p.cliente_nombre}* | Estado: *${p.estado_flotante.toUpperCase()}* - ${fecha}\n`
    })
    respuesta += `\n`
  }

  if (consignaciones.length > 0) {
    respuesta += `🤝 *CONSIGNACIONES:*\n`
    consignaciones.forEach((c) => {
      const fecha = new Date(c.fecha_creacion).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      respuesta += `• \`${c.correlativo}\` — *${c.cliente_nombre}* | Total inicial: $${Number(c.total_usd).toFixed(2)} (${c.estado_flotante.toUpperCase()}) - ${fecha}\n`
    })
    respuesta += `\n`
  }

  return respuesta
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN no configurado')
    return
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}

export async function POST(req: Request) {
  try {
    const update = await req.json()
    const message = update?.message

    if (!message || !message.text) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const userText = message.text

    // 1. Interpretar lenguaje natural con Gemini
    const { intent, query } = await parseIntentWithGemini(userText)

    let replyText = ''

    // 2. Ejecutar la acción según la intención detectada
    switch (intent) {
      case 'CONSULTA_STOCK':
        replyText = await handleConsultaStock(query)
        break

      case 'FACTURACION_HOY':
        replyText = await handleFacturacionHoy()
        break

      case 'ULTIMAS_NOTAS':
        replyText = await handleUltimasNotas()
        break

      case 'RESUMEN_GENERAL': {
        const fact = await handleFacturacionHoy()
        const notas = await handleUltimasNotas()
        replyText = `📊 *Resumen Ejecutivo de Invoficlib:*\n\n${fact}\n\n${notas}`
        break
      }

      case 'AYUDA':
      default:
        replyText = `👋 *Hola, soy el Asistente de Invoficlib con Gemini IA.*\n\nPuedes preguntarme en lenguaje natural:\n\n` +
          `• _"¿Cuánto vendimos hoy?"_\n` +
          `• _"¿Cuánto stock hay de matemáticas?"_\n` +
          `• _"Muéstrame las últimas notas"_ \n` +
          `• _"Dame un resumen general"_\n`
        break
    }

    // 3. Responder al usuario en Telegram
    await sendTelegramMessage(chatId, replyText)

    return NextResponse.json({ success: true, intent })
  } catch (err) {
    console.error('Error en Telegram Webhook:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Invoficlib Telegram Webhook Active' })
}
