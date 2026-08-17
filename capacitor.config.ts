/**
 * capacitor.config.ts
 * -------------------------------------------------------
 * Configuración de CapacitorJS para Invoficlib (Android/APK).
 *
 * Arquitectura de Live Updates:
 * - `server.url`: Apunta a la URL de producción de Vercel.
 * - Cada vez que se realiza un `git push origin master` y Vercel
 *   completa el despliegue, la aplicación en Android carga
 *   automáticamente la última versión al abrirla o recargarla,
 *   eliminando la necesidad de reinstalar un nuevo archivo APK.
 * -------------------------------------------------------
 */
export interface CapacitorConfig {
  appId: string
  appName: string
  webDir: string
  server?: {
    url?: string
    cleartext?: boolean
    allowNavigation?: string[]
  }
  android?: {
    allowMixedContent?: boolean
    captureInput?: boolean
    webContentsDebuggingEnabled?: boolean
  }
  plugins?: Record<string, any>
}

const config: CapacitorConfig = {
  appId: 'com.invoficlib.app',
  appName: 'Invoficlib',
  webDir: 'out',
  server: {
    // URL del despliegue oficial en Vercel
    url: 'https://invoficlib.vercel.app',
    cleartext: true,
    allowNavigation: [
      'invoficlib.vercel.app',
      '*.vercel.app',
      'libcjbesfttwgmigpkot.supabase.co',
      '*.supabase.co',
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config
