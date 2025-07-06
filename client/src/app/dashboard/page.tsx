export default function DashboardPage() {
  return (
    <div className="px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your secure data vault</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vault Status */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Vault Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Vault Status</span>
                  <span className="text-orange-600 font-medium">Not Registered</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Entries</span>
                  <span className="text-gray-900 font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">OpenADP Protection</span>
                  <span className="text-orange-600 font-medium">Pending</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900">Phase 2 & 3 Coming Soon</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Vault registration and entry management will be implemented in upcoming phases
                </p>
              </div>
            </div>
            
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="text-center py-8 text-gray-500">
                <p>No activity yet. Your vault actions will appear here.</p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full btn-primary opacity-50 cursor-not-allowed">
                  Register Vault
                </button>
                <button className="w-full btn-secondary opacity-50 cursor-not-allowed">
                  Add Entry
                </button>
                <button className="w-full btn-secondary opacity-50 cursor-not-allowed">
                  View Entries
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Available in Phase 2 & 3
              </p>
            </div>
            
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Development Status</h2>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  <span className="text-sm text-gray-600">Phase 1: Foundation</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                  <span className="text-sm text-gray-600">Phase 2: Authentication</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                  <span className="text-sm text-gray-600">Phase 3: Core APIs</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                  <span className="text-sm text-gray-600">Phase 4: Security</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 