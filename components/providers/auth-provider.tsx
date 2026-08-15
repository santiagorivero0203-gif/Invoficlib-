'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** Perfil de usuario simulado para la Fase 1 (pre-Supabase Auth). */
export interface AuthUser {
  id: string
  nombre: string
  rol: 'admin' | 'secretaria'
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Pick<AuthUser, 'nombre' | 'email'>>) => void
}

const MOCK_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000001',
  nombre: 'María Pérez',
  rol: 'secretaria',
  email: 'maria.perez@girasol.local',
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Proveedor de autenticación mock para simular sesión antes de conectar Supabase Auth.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(MOCK_USER)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const login = useCallback(async (email: string, _password: string) => {
    // Simulación: acepta cualquier credencial y restaura el usuario mock.
    await new Promise((resolve) => setTimeout(resolve, 300))
    setUser({ ...MOCK_USER, email })
  }, [])

  const logout = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    setUser(null)
  }, [])

  const updateProfile = useCallback(
    (updates: Partial<Pick<AuthUser, 'nombre' | 'email'>>) => {
      setUser((current) => (current ? { ...current, ...updates } : current))
    },
    []
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
      updateProfile,
    }),
    [user, login, logout, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook seguro para consumir el contexto de autenticación mock.
 * @throws Error si se usa fuera de AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
