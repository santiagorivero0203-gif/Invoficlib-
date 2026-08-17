'use client'

/**
 * components/providers/auth-provider.tsx
 * -------------------------------------------------------
 * Proveedor de Autenticación Real conectado a Supabase Auth.
 *
 * Características:
 * 1. Cero cierres de sesión involuntarios: sincronizado con
 *    el token JWT persistente de Supabase (Web & Capacitor).
 * 2. Consulta y sincroniza el rol ('admin' | 'secretaria')
 *    desde la tabla `perfiles`.
 * 3. Expone login, logout, sesión activa y estado de carga.
 * -------------------------------------------------------
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database.types'

export interface AuthUser {
  id: string
  nombre: string
  rol: UserRole
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ error: Error | null }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AuthUser, 'nombre' | 'email'>>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const supabase = useMemo(() => createClient(), [])

  // Carga o sincroniza el perfil del usuario desde la tabla `perfiles`
  const syncUserProfile = useCallback(
    async (sbUser: SupabaseUser) => {
      try {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol, nombre_completo')
          .eq('id', sbUser.id)
          .maybeSingle()

        const rol: UserRole =
          perfil?.rol || (sbUser.user_metadata?.rol as UserRole) || 'secretaria'
        const nombre: string =
          perfil?.nombre_completo ||
          sbUser.user_metadata?.nombre_completo ||
          sbUser.email?.split('@')[0] ||
          'Usuario'

        setUser({
          id: sbUser.id,
          email: sbUser.email || '',
          nombre,
          rol,
        })
      } catch (err) {
        console.error('[AuthProvider] Error sincronizando perfil:', err)
        // Fallback seguro a metadatos de auth
        setUser({
          id: sbUser.id,
          email: sbUser.email || '',
          nombre: sbUser.user_metadata?.nombre_completo || sbUser.email?.split('@')[0] || 'Usuario',
          rol: (sbUser.user_metadata?.rol as UserRole) || 'secretaria',
        })
      } finally {
        setLoading(false)
      }
    },
    [supabase]
  )

  // Inicializar y escuchar cambios de sesión en tiempo real
  useEffect(() => {
    let isMounted = true

    // 1. Obtener sesión activa persistida en almacenamiento
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      if (session?.user) {
        syncUserProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // 2. Suscribirse a eventos de autenticación (Login, Logout, Token Refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (session?.user) {
        syncUserProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, syncUserProfile])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          return { error }
        }

        if (data.user) {
          await syncUserProfile(data.user)
        }

        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    },
    [supabase, syncUserProfile]
  )

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[AuthProvider] Error al cerrar sesión:', err)
    } finally {
      setUser(null)
    }
  }, [supabase])

  const updateProfile = useCallback(
    async (updates: Partial<Pick<AuthUser, 'nombre' | 'email'>>) => {
      if (!user) return

      try {
        if (updates.nombre) {
          await supabase.from('perfiles').upsert({
            id: user.id,
            nombre_completo: updates.nombre,
            rol: user.rol,
          })
        }

        setUser((current) => (current ? { ...current, ...updates } : current))
      } catch (err) {
        console.error('[AuthProvider] Error actualizando perfil:', err)
      }
    },
    [supabase, user]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      login,
      logout,
      updateProfile,
    }),
    [user, loading, login, logout, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook para acceder al contexto de autenticación de Invoficlib.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}

