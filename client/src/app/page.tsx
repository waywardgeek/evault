'use client';

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session) {
      router.push('/vault');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to eVault
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your secure personal data vault with nation-state resistant protection
        </p>
        
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">🔒 Secure Storage</h3>
              <p className="text-gray-600">
                Store your sensitive data with distributed cryptography protection
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">🌍 Distributed Trust</h3>
              <p className="text-gray-600">
                No single point of failure across multiple countries
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">⚡ Frictionless Access</h3>
              <p className="text-gray-600">
                Add entries without PIN, view with PIN protection
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">🛡️ Nation-State Resistant</h3>
              <p className="text-gray-600">
                OpenADP transforms simple PINs into cryptographically strong keys
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-center space-x-4">
              <button 
                onClick={handleGetStarted}
                disabled={status === 'loading'}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Loading...' : session ? 'Go to Vault' : 'Get Started'}
              </button>
              <Link href="/dashboard" className="btn-secondary">
                Go to Dashboard
              </Link>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Phase 1 - Foundation Complete</p>
              <p>Server health: <span className="text-green-600">✓</span></p>
              <p>Client ready: <span className="text-green-600">✓</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 