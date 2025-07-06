export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Authentication will be implemented in Phase 2
          </p>
        </div>
        
        <div className="card">
          <div className="space-y-6">
            <div className="text-center">
              <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  🔒 Google OAuth Coming Soon
                </h3>
                <p className="text-gray-600 mb-4">
                  Secure authentication with Google OAuth will be implemented in Phase 2
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>• Google OAuth integration</p>
                  <p>• JWT token management</p>
                  <p>• Session handling</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <a
                href="/dashboard"
                className="btn-secondary"
              >
                Continue to Dashboard (Development)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 