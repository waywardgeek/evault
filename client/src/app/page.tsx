'use client';

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

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
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Side - Text Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-gray-900 leading-relaxed mb-6">
                Enable Advanced Data Protection.
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-4 font-light">
                We'll keep your data private and safe.
              </p>
              
              <p className="text-sm text-gray-500 mb-12">
                <a 
                  href="https://www.tiktok.com/@naomibrockwell/video/7222605522887855361" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Learn how
                </a>
              </p>
              
              <div className="mt-12">
                <button
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-12 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
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

            {/* Right Side - Phone Image */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <img
                  src="/phone.jpeg"
                  alt="iPhone showing Advanced Data Protection"
                  className="max-w-full h-auto max-h-[600px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 