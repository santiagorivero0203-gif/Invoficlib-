# Guía Rápida: Instalar la App Móvil y Generar APK sin Android Studio

Con la configuración de **PWA (Progressive Web App)** y el `manifest.json` que acabamos de implementar, ya no necesitas instalar Android Studio para tener la aplicación en los teléfonos de la empresa.

Tienes dos opciones sumamente fáciles:

---

## 🚀 Opción 1: Instalación Directa como App Nativa (La más recomendada - 10 segundos)

Cualquier teléfono Android o iPhone puede instalar Invoficlib directamente desde el navegador:

### En Android (Google Chrome / Brave / Edge):
1. Abre en el teléfono la URL del sistema: **`https://invoficlib.vercel.app`**
2. Inicia sesión con las credenciales de la empresa.
3. Aparecerá un aviso automático en la parte inferior: **"Agregar Invoficlib a la pantalla principal"** o **"Instalar aplicación"**.  
   *(Si no aparece, toca los **3 puntos** arriba a la derecha en Chrome y selecciona **"Instalar aplicación"**)*.
4. Toca **Instalar**.

### ¿Qué ocurre al instalarla?
- Se crea el icono oficial de **Invoficlib** en el cajón de aplicaciones del teléfono.
- Al tocar el icono, se abre en **pantalla completa** (sin barras de navegador, sin barra de direcciones, como una app nativa de Android).
- La sesión **se mantiene abierta para siempre** (persistSession).
- Cada vez que se haga un `git push`, la app se actualiza automáticamente al instante.

---

## 📦 Opción 2: Descargar el archivo `.apk` instalable con PWABuilder (Gratis y en 30 segundos)

Si deseas tener el archivo instalador `.apk` físico para enviarlo por WhatsApp o Telegram:

1. Entra desde tu computadora a: **[https://www.pwabuilder.com/](https://www.pwabuilder.com/)**
2. En la barra de búsqueda pega la URL de tu proyecto:
   ```
   https://invoficlib.vercel.app
   ```
3. Haz clic en **"Start"**. PWABuilder analizará el `manifest.json` y los iconos de Invoficlib (obtendrás un puntaje perfecto).
4. Haz clic en el botón azul **"Package for Stores"** o **"Package for Android"**.
5. Selecciona la opción **"Generate APK"** (o descarga el zip con el APK firmado).
6. ¡Listo! En 30 segundos tendrás tu archivo **`.apk`** listo para enviar por WhatsApp o Telegram e instalar en cualquier dispositivo Android.
