'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { UserResponse } from '../../../../shared/types/api'

interface UserStats {
  total_users: number
  recent_signups_7d: number
  recent_signups_30d: number
  users_with_vaults: number
  total_entries: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [serverUser, setServerUser] = useState<UserResponse | null>(null)
  const [apiStatus, setApiStatus] = useState<any>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
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

        // Get user statistics
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
          const response = await fetch(`${apiUrl}/api/stats`)
          if (response.ok) {
            const stats = await response.json()
            setUserStats(stats)
          }
        } catch (err) {
          console.log('Failed to fetch user stats:', err)
        }

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

      {/* User Statistics */}
      <div className="card mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          📊 User Statistics
        </h3>
        {userStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">{userStats.total_users}</p>
                </div>
                <div className="text-blue-600">👥</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">New This Week</p>
                  <p className="text-2xl font-bold text-green-900">{userStats.recent_signups_7d}</p>
                </div>
                <div className="text-green-600">🆕</div>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">With Vaults</p>
                  <p className="text-2xl font-bold text-purple-900">{userStats.users_with_vaults}</p>
                </div>
                <div className="text-purple-600">🔐</div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">New This Month</p>
                  <p className="text-2xl font-bold text-orange-900">{userStats.recent_signups_30d}</p>
                </div>
                <div className="text-orange-600">📅</div>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">Total Entries</p>
                  <p className="text-2xl font-bold text-indigo-900">{userStats.total_entries}</p>
                </div>
                <div className="text-indigo-600">📝</div>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Vault Adoption</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userStats.total_users > 0 ? Math.round((userStats.users_with_vaults / userStats.total_users) * 100) : 0}%
                  </p>
                </div>
                <div className="text-gray-600">📈</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading user statistics...</p>
          </div>
        )}
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