import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'eVaultApp - Secure Personal Data Vault',
  description: 'A secure personal data vault using OpenADP distributed cryptography',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#3B82F6',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-6">
                  <div className="flex items-center space-x-3">
                    <img src="/icon.svg" alt="eVaultApp" className="w-8 h-8" />
                    <h1 className="text-2xl font-bold text-gray-900">eVaultApp</h1>
                  </div>
                  <nav className="flex space-x-8">
                    <a href="/" className="text-gray-500 hover:text-gray-900">Home</a>
                    <a href="/about" className="text-gray-500 hover:text-gray-900">About</a>
                    <a href="/vault" className="text-gray-500 hover:text-gray-900">Vault</a>
                    <a href="/account" className="text-gray-500 hover:text-gray-900">Account</a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
} 