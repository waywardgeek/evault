'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export default function TestAuthPage() {
  const { data: session, status } = useSession()
  const [serverToken, setServerToken] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Log NextAuth status
    console.log('NextAuth status:', status)
    console.log('Session:', session)
    
    if (session?.serverToken) {
      setServerToken(session.serverToken)
      apiClient.setToken(session.serverToken)
      fetchUserInfo()
    }
  }, [session, status])

  const fetchUserInfo = async () => {
    try {
      const response = await apiClient.get('/user/info')
      setUserInfo(response)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const testGoogleSignIn = async () => {
    try {
      console.log('Starting Google sign in...')
      setError(null)
      const result = await signIn('google', { 
        callbackUrl: '/test-auth',
        redirect: true 
      })
      console.log('SignIn result:', result)
    } catch (err) {
      console.error('SignIn error:', err)
      setError('Failed to start sign in: ' + (err as any).message)
    }
  }

  const testSignOut = () => {
    signOut({ redirect: false })
    setServerToken(null)
    setUserInfo(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">OAuth Test Page</h1>
        
        {/* Status Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p><span className="font-medium">NextAuth Status:</span> {status}</p>
            <p><span className="font-medium">Session:</span> {session ? 'Active' : 'None'}</p>
            {session && (
              <>
                <p><span className="font-medium">Provider:</span> {(session as any).provider || 'N/A'}</p>
                <p><span className="font-medium">Email:</span> {session.user?.email}</p>
              </>
            )}
            <p><span className="font-medium">Server Token:</span> {serverToken ? `${serverToken.substring(0, 20)}...` : 'None'}</p>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            {!session ? (
              <>
                <button
                  onClick={testGoogleSignIn}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Sign in with Google (via NextAuth)
                </button>
                <a
                  href="/api/auth/signin/google"
                  className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block"
                >
                  Sign in with Google (Direct Link)
                </a>
              </>
            ) : (
              <>
                <button
                  onClick={testSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
                <button
                  onClick={fetchUserInfo}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Refresh User Info
                </button>
              </>
            )}
          </div>
        </div>

        {/* User Info Section */}
        {userInfo && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">User Info from API</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Session Details */}
        {session && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Session Details</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">Setup Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Make sure you've added http://localhost:3000 to Google OAuth origins</li>
            <li>Add http://localhost:3000/api/auth/callback/google to redirect URIs</li>
            <li>Add GOOGLE_CLIENT_SECRET to your .env.local file</li>
            <li>Restart the dev server after updating .env.local</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 