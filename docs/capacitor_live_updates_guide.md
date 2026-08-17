# Guía de Empaquetado APK (CapacitorJS) y Live Updates — Invoficlib

Esta guía explica cómo compilar el archivo `.apk` de **Invoficlib** y cómo funciona el sistema de **Live Updates** que permite actualizar la aplicación automáticamente en los teléfonos de los usuarios sin tener que reinstalar el APK.

---

## 1. ¿Cómo funciona la arquitectura de Live Updates?

En `capacitor.config.ts`, la propiedad `server.url` está configurada hacia el servidor de producción:
```ts
server: {
  url: 'https://invoficlib.vercel.app',
  cleartext: true,
  allowNavigation: ['invoficlib.vercel.app', '*.vercel.app', '*.supabase.co']
}
```

### Flujo de actualización automática:
1. **Desarrollo:** Realizas cambios en el código de Invoficlib en tu equipo.
2. **Despliegue:** Ejecutas `git push origin master`.
3. **Vercel:** Vercel compila y publica los cambios en 1 minuto.
4. **Android:** Cuando el Jefe o la Secretaria abren la app en su teléfono, Capacitor carga directamente la nueva versión desde la nube.
5. **Resultado:** **Cero necesidad de generar o instalar un nuevo archivo `.apk`** para cambios de interfaz, reportes, notas o lógica de negocio.

---

## 2. Pasos para Generar el APK Inicial en tu Computadora

### A. Requisitos Previos:
- **Node.js** (v18+)
- **Android Studio** instalado con el Android SDK.

### B. Inicialización del Entorno Móvil:
Ejecuta los siguientes comandos en la terminal de tu proyecto:

```bash
# 1. Instalar dependencias de Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Agregar la plataforma Android
npx cap add android

# 3. Sincronizar la configuración
npx cap sync
```

### C. Abrir en Android Studio y Generar el APK:
```bash
# Abre el proyecto nativo en Android Studio
npx cap open android
```

Una vez que abra Android Studio:
1. Espera que Gradle termine de sincronizar (1-2 minutos la primera vez).
2. Ve al menú superior: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Al finalizar, aparecerá una notificación abajo a la derecha: *"APK(s) generated successfully"*.
4. Haz clic en **locate** y encontrarás tu archivo **`app-debug.apk`**.

---

## 3. Instalación en el Teléfono del Jefe / Secretaria

1. Envía el archivo `app-debug.apk` por WhatsApp o Telegram a los teléfonos.
2. Abre el archivo e instálalo (permite "Instalar aplicaciones de fuentes desconocidas").
3. ¡Listo! Esta será la **única vez** que necesitarán instalar el APK. A partir de aquí, cada actualización en GitHub se reflejará al instante.
