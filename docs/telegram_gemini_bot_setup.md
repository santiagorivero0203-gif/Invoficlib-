# Guía de Configuración: Bot de Telegram con Gemini IA — Invoficlib

Esta guía explica cómo activar el Bot de Telegram de **Invoficlib** asistido por **Google Gemini IA** para que el Jefe pueda consultar stock, facturación y notas desde su teléfono.

---

## 1. Crear el Bot en Telegram (BotFather)

1. Abre Telegram y busca el usuario oficial **`@BotFather`**.
2. Envía el comando `/newbot`.
3. Asigna un nombre al bot (ej: `Invoficlib Assistant`) y un nombre de usuario terminado en `bot` (ej: `InvoficlibBot` o `InvoficlibOficialBot`).
4. **BotFather** te responderá con el **Token HTTP API** (ej: `7182938492:AAHj...`).
5. Guarda este token como `TELEGRAM_BOT_TOKEN`.

---

## 2. Obtener la API Key de Google Gemini

1. Entra a [Google AI Studio](https://aistudio.google.com/).
2. Haz clic en **Get API Key** y crea una clave gratuita.
3. Guarda esta clave como `GEMINI_API_KEY`.

---

## 3. Configurar Variables de Entorno en Vercel o Supabase

En tu panel de **Vercel** (**Settings > Environment Variables**) o en **Supabase** (**Edge Functions > Secrets**), agrega:

| Variable | Valor | Descripción |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `7182938492:AAHj...` | Token del bot generado en BotFather |
| `GEMINI_API_KEY` | `AIzaSy...` | Clave de Google Gemini AI Studio |

---

## 4. Registrar el Webhook

Una vez desplegado en Vercel, ejecuta este comando en tu terminal o navegador reemplazando tu token y la URL de Vercel:

```bash
# Registrar Webhook en Telegram:
curl -X POST "https://api.telegram.org/bot<TU_TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://invoficlib.vercel.app/api/webhook/telegram"}'
```

Telegram responderá:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

---

## 5. Comandos de Prueba en Lenguaje Natural

Abre el chat de tu bot en Telegram y prueba preguntarle:
- 🗣️ *"¿Cuánto vendimos hoy?"* -> Responderá con la suma en USD y cantidad de pedidos.
- 🗣️ *"¿Cuánto stock hay de matemáticas?"* -> Consultará la vista `stock_actual` y mostrará unidades, SKU y precios.
- 🗣️ *"Muéstrame las últimas notas"* -> Listará las últimas 6 notas agrupando Ventas, Promociones y Consignaciones.
- 🗣️ *"Dame un resumen general"* -> Entregará el balance ejecutivo completo.
