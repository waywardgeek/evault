'use client';

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger';
import { useSession, signOut } from 'next-auth/react'
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger';
import { User, Mail, Trash2, Shield, Key, LogOut } from 'lucide-react'
import { logger } from '@/lib/logger';

interface AccountInfo {
  email: string;
  created_at: string;
  has_vault: boolean;
  total_entries: number;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChanging, setEmailChanging] = useState(false);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login?callbackUrl=/account');
      return;
    }
  }, [session, status, router]);

  // Load account information
  useEffect(() => {
    const loadAccountInfo = async () => {
      if (!session) return;

      try {
        const token = (session as any).serverToken;
        logger.debug('🔍 Loading account info - Server token available:', !!token);
        
        if (!token) {
          throw new Error('No server token available. Please sign out and sign in again.');
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/user/info`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load account information');
        }

        const data = await response.json();
        setAccountInfo(data);
      } catch (error) {
        logger.error('Failed to load account info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccountInfo();
  }, [session]);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newEmail.trim()) return;

    setEmailChanging(true);
    try {
      const token = (session as any).serverToken;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/user/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail.trim() })
      });

      // Debug: Log the raw response text to see what we're getting
      const responseText = await response.text();
      logger.debug('🔍 Raw response:', responseText);
      logger.debug('🔍 Response status:', response.status);
      logger.debug('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Parse JSON response for both success and error cases
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('❌ JSON Parse Error:', parseError);
        logger.error('❌ Raw response text:', responseText);
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email');
      }

      // Update local state with the new email from server response
      setAccountInfo(prev => prev ? { ...prev, email: data.email || newEmail.trim() } : null);
      setShowChangeEmail(false);
      setNewEmail('');
      alert('Email updated successfully!');
    } catch (error) {
      logger.error('Failed to update email:', error);
      alert(`Failed to update email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setEmailChanging(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session) return;

    if (!confirm('⚠️ WARNING: This will permanently delete your account, vault, and all entries. This cannot be undone. Are you sure?')) {
      return;
    }
    
    if (!confirm('🗑️ Final confirmation: Delete account and ALL data permanently?')) {
      return;
    }

    try {
      setLoading(true);
      logger.debug('🗑️ Starting account deletion process...');

      const token = (session as any).serverToken;
      logger.debug('🔍 Server token available:', !!token);
      
      if (!token) {
        throw new Error('No server token available. Please sign out and sign in again.');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/user/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      logger.debug('✅ Account deleted from server');

      // Clear all local storage and cached data
      const { clearAllKeys } = await import('@/lib/openadp');
      await clearAllKeys();
      localStorage.removeItem('jwt_token');

      logger.debug('✅ Cleared all local data');
      logger.debug('🔄 Logging out to clear authentication state...');

      // Force logout to clear OAuth session
      await signOut({ redirect: true, callbackUrl: '/login' });
      
    } catch (error) {
      logger.error('❌ Failed to delete account:', error);
      alert(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-8">
          {/* Account Overview */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center mb-4">
              <User className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Account Overview</h2>
            </div>
            
            {accountInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Email Address</h3>
                  <p className="text-lg text-gray-900">{accountInfo.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Account Created</h3>
                  <p className="text-lg text-gray-900">
                    {new Date(accountInfo.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Vault Status</h3>
                  <p className={`text-lg font-medium ${accountInfo.has_vault ? 'text-green-600' : 'text-orange-600'}`}>
                    {accountInfo.has_vault ? '✓ Active' : '⚠ Not Set Up'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Entries</h3>
                  <p className="text-lg text-gray-900">{accountInfo.total_entries}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading account information...</p>
            )}
          </div>

          {/* Email Management */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Mail className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold">Email Management</h2>
              </div>
              <button
                onClick={() => setShowChangeEmail(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Change Email
              </button>
            </div>

            {/* Current Email Display */}
            {accountInfo && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Current Email Address</h3>
                    <p className="text-lg text-gray-900 font-medium">{accountInfo.email}</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Shield className="h-5 w-5 mr-1" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                </div>
              </div>
            )}

            {showChangeEmail && (
              <form onSubmit={handleChangeEmail} className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new email address"
                    required
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeEmail(false);
                      setNewEmail('');
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailChanging}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {emailChanging ? 'Updating...' : 'Update Email'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Email Security</p>
                  <p className="text-sm text-blue-600">
                    Your email is used for authentication and account recovery. Keep it secure and up to date.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Vault Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-xl font-semibold">Vault Status</h2>
            </div>

            {accountInfo?.has_vault ? (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-green-800 font-medium">Vault Active</p>
                    <p className="text-sm text-green-600">
                      Your vault is set up and protecting {accountInfo.total_entries} entries
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm text-orange-800 font-medium">Vault Not Set Up</p>
                    <p className="text-sm text-orange-600">
                      Use the Vault page to set up your secure storage
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sign Out Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center mb-4">
              <LogOut className="h-6 w-6 text-orange-600 mr-2" />
              <h2 className="text-xl font-semibold">Session Management</h2>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-orange-800 mb-2">Sign Out</h3>
                  <p className="text-sm text-orange-700">
                    Sign out of your account and return to the login page. Your data will remain secure.
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Delete Account</h3>
              <p className="text-sm text-red-700 mb-4">
                Permanently delete your account, vault, and all stored data. This action cannot be undone.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
    </div>
  );
} 