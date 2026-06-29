import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { authApi } from '../services/auth'
import { api } from '../services/api'
import { User, AuthTokens } from '../types'

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/v1/profile/me')
      setUser(response.data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const storedTokens = localStorage.getItem('access_token')
    if (storedTokens) {
      setTokens({
        access_token: storedTokens,
        refresh_token: localStorage.getItem('refresh_token') || '',
        token_type: 'bearer',
      })
      fetchUser()
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    setTokens(data)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    await fetchUser()
  }

  const logout = () => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const contextValue = {
    user,
    tokens,
    isAuthenticated: !!tokens,
    isLoading,
    login,
    logout,
    fetchUser,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
