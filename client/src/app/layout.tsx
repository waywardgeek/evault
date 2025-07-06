import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'eVault - Secure Personal Data Vault',
  description: 'A secure personal data vault with distributed cryptography protection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">eVault</h1>
                </div>
                <nav className="flex space-x-8">
                  <a href="/" className="text-gray-500 hover:text-gray-900">Home</a>
                  <a href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</a>
                  <a href="/login" className="text-gray-500 hover:text-gray-900">Login</a>
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
} 