import api from './api'
import { LoginRequest, AuthTokens } from '../types'

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthTokens> => {
    const response = await api.post('/api/v1/auth/login', data)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await api.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/v1/auth/logout')
  },
}