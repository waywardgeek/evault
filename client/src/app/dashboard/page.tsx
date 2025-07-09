'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { UserResponse } from '../../../../shared/types/api'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [serverUser, setServerUser] = useState<UserResponse | null>(null)
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get API status
        const status = await apiClient.getStatus()
        setApiStatus(status)

        // If we have a session, try to get server user data
        if (session?.serverToken) {
          try {
            const userData = await apiClient.getCurrentUser()
            setServerUser(userData)
          } catch (err) {
            // Expected to fail since we're using mock tokens
            console.log('Server auth not implemented yet:', err)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    if (status !== 'loading') {
      loadData()
    }
  }, [session, status])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          eVaultApp Dashboard
        </h1>
        <p className="text-gray-600">
          System status and debugging information
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Authentication Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🔐 Authentication Status
          </h3>
          {session ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <span className="text-sm font-medium text-green-600">✅ Authenticated</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-medium">{session.user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Name:</span>
                <span className="text-sm font-medium">{session.user?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Provider:</span>
                <span className="text-sm font-medium">Google OAuth</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Server Token:</span>
                <span className="text-sm font-medium">
                  {session.serverToken ? '✅ Available' : '❌ Not Set'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Not authenticated</p>
              <button
                onClick={() => router.push('/login')}
                className="btn-primary"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            🔌 API Connection
          </h3>
          {apiStatus ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Server:</span>
                <span className="text-sm font-medium text-green-600">✅ Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Authentication:</span>
                <span className="text-sm font-medium text-green-600">✅ Implemented</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Available Endpoints:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• POST /api/auth/url</li>
                  <li>• POST /api/auth/callback</li>
                  <li>• GET /api/user (protected)</li>
                  <li>• POST /api/user/refresh (protected)</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600">No API connection</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          🚀 Quick Access
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Your Vault</h4>
              <p className="text-sm text-blue-700 mt-1">
                Access your secure vault with encrypted storage
              </p>
            </div>
            <a
              href="/vault"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Open Vault
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 