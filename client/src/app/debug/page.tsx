'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [serverConfig, setServerConfig] = useState<any>(null)
  const [clientConfig, setClientConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        // Get server config
        const serverResponse = await fetch('/api/server/debug/config')
        const serverData = await serverResponse.json()
        setServerConfig(serverData)

        // Get client config (environment variables)
        const clientData = {
          google_client_id: 'CLIENT_SIDE_NOT_ACCESSIBLE', // Google Client ID is server-side only for security
          next_public_api_url: process.env.NEXT_PUBLIC_API_URL || 'NOT_SET',
          nextauth_url: 'SERVER_SIDE_ONLY', // Server-side only for security
          nextauth_secret_set: 'SERVER_SIDE_ONLY', // Server-side only for security
        }
        setClientConfig(clientData)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch config')
      } finally {
        setLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  const ConfigCard = ({ title, config, bgColor }: { title: string; config: any; bgColor: string }) => (
    <div className={`p-6 rounded-lg shadow-md ${bgColor}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {config && Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="font-medium">{key}:</span>
            <span className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading debug information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OAuth Debug Center</h1>
          <p className="text-gray-600">Diagnose Google OAuth configuration issues</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ConfigCard 
            title="Client Configuration (NextAuth)" 
            config={clientConfig} 
            bgColor="bg-blue-50 border border-blue-200"
          />
          <ConfigCard 
            title="Server Configuration (Go)" 
            config={serverConfig} 
            bgColor="bg-green-50 border border-green-200"
          />
        </div>

        {/* Configuration Analysis */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Configuration Analysis</h3>
          <div className="space-y-3">
            {clientConfig && serverConfig && (
              <>
                <div className="flex items-center">
                  <span className="w-4 h-4 rounded-full mr-3 bg-blue-500"></span>
                  <span className="font-medium">Google Client ID Match:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    clientConfig.google_client_id === serverConfig.google_client_id
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {clientConfig.google_client_id === serverConfig.google_client_id ? '✅ Match' : '❌ Mismatch'}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="w-4 h-4 rounded-full mr-3 bg-green-500"></span>
                  <span className="font-medium">Server Google Client Secret:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    serverConfig.google_client_secret_set
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {serverConfig.google_client_secret_set ? '✅ Set' : '❌ Not Set'}
                  </span>
                </div>

                <div className="flex items-center">
                  <span className="w-4 h-4 rounded-full mr-3 bg-yellow-500"></span>
                  <span className="font-medium">NextAuth Secret:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    clientConfig.nextauth_secret_set === 'SET'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {clientConfig.nextauth_secret_set === 'SET' ? '✅ Set' : '❌ Not Set'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Session Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Session Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                status === 'authenticated' ? 'bg-green-100 text-green-800' :
                status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {status}
              </span>
            </div>
            {session && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Email:</span>
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                    {session.user?.email || 'Not available'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Server Token:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    session.serverToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {session.serverToken ? '✅ Available' : '❌ Not Set'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 