'use client';

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, Smartphone, Tablet, Check, ArrowRight } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session) {
      router.push('/vault');
    } else {
      // Use NextAuth's callbackUrl parameter to redirect to vault after login
      router.push('/login?callbackUrl=/vault');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative pt-16 pb-32 sm:pt-24 sm:pb-40 lg:pt-32 lg:pb-48">
            <div className="text-center">
              <h1 className="text-4xl tracking-tight font-bold text-gray-900 sm:text-5xl lg:text-6xl">
                <span className="block">Privacy First.</span>
                <span className="block text-blue-600">Always.</span>
              </h1>
              <p className="mt-6 max-w-lg mx-auto text-xl text-gray-500 sm:max-w-3xl">
                Your personal data deserves nation-state level protection. 
                Experience true privacy with distributed cryptography that even Apple would admire.
              </p>
              <div className="mt-10 flex justify-center">
                <button
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : session ? (
                    <>
                      Go to Vault
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Device Mockups */}
            <div className="mt-20 relative">
              <div className="flex items-center justify-center space-x-8">
                {/* iPhone Mockup */}
                <div className="relative">
                  <div className="w-64 h-128 bg-gradient-to-b from-gray-100 to-gray-200 rounded-[3rem] shadow-2xl border-8 border-gray-300 relative overflow-hidden">
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-400 rounded-full"></div>
                    <div className="h-full flex flex-col items-center justify-center bg-white m-4 mt-8 mb-4 rounded-[2.5rem]">
                      <div className="bg-blue-50 p-8 rounded-full mb-6">
                        <Shield className="h-16 w-16 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Vault</h3>
                      <p className="text-sm text-gray-600 text-center px-4">Your recovery codes, protected by distributed cryptography</p>
                    </div>
                  </div>
                </div>

                {/* iPad Mockup */}
                <div className="relative hidden md:block">
                  <div className="w-80 h-96 bg-gradient-to-b from-gray-100 to-gray-200 rounded-[2rem] shadow-2xl border-8 border-gray-300 relative overflow-hidden">
                    <div className="h-full flex flex-col items-center justify-center bg-white m-4 rounded-[1.5rem]">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-12 rounded-full mb-8">
                        <Lock className="h-20 w-20 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Nation-State Resistant</h3>
                      <p className="text-gray-600 text-center px-8">OpenADP transforms simple PINs into cryptographically strong protection</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for Privacy Enthusiasts
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              The security features you'd expect from a company that puts privacy first
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-50 p-3 rounded-full w-fit mb-6">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">End-to-End Encryption</h3>
              <p className="text-gray-600">Your data is encrypted before it ever leaves your device. Not even we can access it.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-50 p-3 rounded-full w-fit mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Zero Knowledge</h3>
              <p className="text-gray-600">We never see your PIN, passwords, or recovery codes. Your privacy is absolute.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-purple-50 p-3 rounded-full w-fit mb-6">
                <Smartphone className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Device Native</h3>
              <p className="text-gray-600">Designed to feel at home on your iPhone, iPad, and Mac with native performance.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-orange-50 p-3 rounded-full w-fit mb-6">
                <Lock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Distributed Security</h3>
              <p className="text-gray-600">Your security spans multiple countries. No single point of failure, ever.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ready to protect what matters most?
          </h2>
          <p className="mt-6 text-xl text-gray-600">
            Join thousands of privacy-conscious users who trust eVault with their most sensitive data.
          </p>
          <div className="mt-10">
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-12 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {session ? 'Go to Vault' : 'Start Protecting Your Data'}
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Free to start. No credit card required.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">eVault</h3>
            <p className="text-gray-600 mb-8">Privacy First. Always.</p>
            <div className="flex justify-center space-x-8">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/vault" className="text-gray-500 hover:text-gray-900 transition-colors">
                Vault
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 