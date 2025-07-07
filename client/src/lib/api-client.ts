import { getSession } from 'next-auth/react'
import type { 
  AuthRequest, 
  AuthResponse, 
  CallbackRequest, 
  CallbackResponse,
  UserResponse,
  RefreshTokenResponse,
  ErrorResponse 
} from '@/types/api'

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  }

  async setToken(token: string) {
    this.token = token
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token
    
    // Get token from NextAuth session
    const session = await getSession()
    if (session?.serverToken) {
      this.token = session.serverToken
      return this.token
    }
    
    return null
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const token = await this.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }))
      throw new Error(error.error)
    }

    return response.json()
  }

  // Public authentication endpoints
  async getAuthURL(request: AuthRequest = {}): Promise<AuthResponse> {
    return this.makeRequest<AuthResponse>('/api/auth/url', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async handleCallback(request: CallbackRequest): Promise<CallbackResponse> {
    return this.makeRequest<CallbackResponse>('/api/auth/callback', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Protected endpoints (require authentication)
  async getCurrentUser(): Promise<UserResponse> {
    return this.makeRequest<UserResponse>('/api/user')
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    return this.makeRequest<RefreshTokenResponse>('/api/user/refresh', {
      method: 'POST',
    })
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.makeRequest<{ status: string; service: string }>('/health')
  }

  // API status
  async getStatus(): Promise<any> {
    return this.makeRequest<any>('/api/status')
  }

  // Generic HTTP methods for vault operations
  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
    })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient 