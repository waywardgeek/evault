'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { openadp, crypto_service, getCachedPublicKey, cachePublicKey, clearCachedKey } from '@/lib/openadp';
import { VaultStatusResponse, ListEntriesResponse, GetEntriesResponse } from '@/../../shared/types/api';

interface VaultEntry {
  name: string;
  hpkeBlob: string;
  decryptedSecret?: string;
}

export default function VaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [vaultStatus, setVaultStatus] = useState<VaultStatusResponse | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showRegisterVault, setShowRegisterVault] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
  }, [session, status, router]);

  // Load vault status and entries
  useEffect(() => {
    if (session) {
      loadVaultData();
    }
  }, [session]);

  // Check if we have cached public key (unlocked state)
  useEffect(() => {
    const cachedKey = getCachedPublicKey();
    setIsUnlocked(!!cachedKey);
  }, []);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      
      // Check vault status
      const statusResponse = await apiClient.get<VaultStatusResponse>('/api/vault/status');
      setVaultStatus(statusResponse);
      
      if (statusResponse.has_vault) {
        // Load entry list
        const entriesResponse = await apiClient.get<GetEntriesResponse>('/api/entries');
        setEntries(entriesResponse.entries.map((entry: any) => ({
          name: entry.name,
          hpkeBlob: entry.hpke_blob
        })));
      }
    } catch (error) {
      console.error('Failed to load vault data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVault = async (pin: string) => {
    try {
      setLoading(true);
      
      // SECURITY: Client handles ALL OpenADP operations directly
      const { metadata } = await openadp.registerNewVault(session!.serverUser!.user_id, pin);
      
      // Register with server - SECURITY: Only send metadata, no OpenADP calls by server
      await apiClient.post('/api/vault/register', {
        pin: pin, // Server validates PIN but doesn't call OpenADP
        openadp_metadata: metadata
      });
      
      // SECURITY: Public key is now stored locally during OpenADP registration
      setIsUnlocked(true);
      
      // Reload vault data
      await loadVaultData();
      setShowRegisterVault(false);
      
      alert('Vault registered successfully! You can now add entries without entering your PIN.');
    } catch (error) {
      console.error('Failed to register vault:', error);
      alert('Failed to register vault. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockVault = async (pin: string) => {
    try {
      setLoading(true);
      
      // SECURITY: Get metadata from server, but client handles OpenADP recovery
      const recoverResponse = await apiClient.post<{ success: boolean; openadp_metadata: string }>('/api/vault/recover', { pin });
      
      if (!recoverResponse.openadp_metadata) {
        throw new Error('No vault metadata returned from server');
      }
      
      // SECURITY: Client handles OpenADP recovery directly - no server OpenADP calls
      const { privateKey, remaining } = await openadp.recoverVaultKey(
        recoverResponse.openadp_metadata,
        pin
      );
      
      // SECURITY: Public key is now stored locally during OpenADP recovery
      setIsUnlocked(true);
      setShowPinPrompt(false);
      
      // Decrypt all entries
      const decryptedEntries = await Promise.all(
        entries.map(async (entry) => {
          try {
            const { secret } = await crypto_service.decryptEntry(entry.hpkeBlob, privateKey);
            return { ...entry, decryptedSecret: secret };
          } catch (error) {
            console.error(`Failed to decrypt entry ${entry.name}:`, error);
            return entry;
          }
        })
      );
      
      setEntries(decryptedEntries);
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      alert('Failed to unlock vault. Please check your PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (name: string, secret: string) => {
    try {
      setLoading(true);
      
      // Check if we have a locally stored public key
      if (!getCachedPublicKey()) {
        setShowPinPrompt(true);
        return;
      }
      
      // Encrypt entry - SECURITY: Uses locally stored public key
      const { hpkeBlob, deletionHash } = await crypto_service.encryptEntry(name, secret);
      
      // Add to server
      await apiClient.post('/api/entries', {
        name,
        hpke_blob: hpkeBlob,
        deletion_hash: deletionHash
      });
      
      // Reload entries
      await loadVaultData();
      setShowAddEntry(false);
      
      alert('Entry added successfully!');
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert('Failed to add entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      setLoading(true);
      
      // TODO: Implement proper deletion with pre-hash validation
      await apiClient.delete('/api/entries', {
        name,
        deletion_pre_hash: 'placeholder' // This needs proper implementation
      });
      
      // Reload entries
      await loadVaultData();
      
      alert('Entry deleted successfully!');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLockVault = () => {
    clearCachedKey(); // SECURITY: Clears locally stored HPKE keys
    setIsUnlocked(false);
    setEntries(entries.map(entry => ({ name: entry.name, hpkeBlob: entry.hpkeBlob })));
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vault...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">eVault</h1>
              <span className="ml-2 text-sm text-gray-500">Phase 3</span>
            </div>
            <nav className="flex space-x-8">
              <a href="/" className="text-gray-500 hover:text-gray-900">Home</a>
              <a href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</a>
              <span className="text-blue-600 font-medium">Vault</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-8">
          {/* Vault Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Vault Status</h2>
            {vaultStatus ? (
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">Vault Registered:</span>
                  <span className={`ml-2 text-sm font-medium ${vaultStatus.has_vault ? 'text-green-600' : 'text-red-600'}`}>
                    {vaultStatus.has_vault ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">Vault Unlocked:</span>
                  <span className={`ml-2 text-sm font-medium ${isUnlocked ? 'text-green-600' : 'text-orange-600'}`}>
                    {isUnlocked ? '✓ Yes (Frictionless Adding Enabled)' : '✗ No (PIN Required)'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading vault status...</p>
            )}
            
            <div className="mt-4 flex space-x-4">
              {!vaultStatus?.has_vault && (
                <button
                  onClick={() => setShowRegisterVault(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Register New Vault
                </button>
              )}
              
              {vaultStatus?.has_vault && !isUnlocked && (
                <button
                  onClick={() => setShowPinPrompt(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Unlock Vault (Enter PIN)
                </button>
              )}
              
              {isUnlocked && (
                <button
                  onClick={handleLockVault}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                >
                  Lock Vault
                </button>
              )}
            </div>
          </div>

          {/* Entries Section */}
          {vaultStatus?.has_vault && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Vault Entries</h2>
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  disabled={!getCachedPublicKey()}
                >
                  Add Entry {!getCachedPublicKey() && '(PIN Required)'}
                </button>
              </div>

              {entries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No entries yet. Add your first recovery codes!
                </p>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{entry.name}</h3>
                          {entry.decryptedSecret ? (
                            <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                              {entry.decryptedSecret}
                            </pre>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500">
                              🔒 Encrypted - Enter PIN to view
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(entry.name)}
                          className="ml-4 text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showRegisterVault && (
        <RegisterVaultModal
          onRegister={handleRegisterVault}
          onCancel={() => setShowRegisterVault(false)}
        />
      )}

      {showPinPrompt && (
        <PinPromptModal
          onUnlock={handleUnlockVault}
          onCancel={() => setShowPinPrompt(false)}
        />
      )}

      {showAddEntry && (
        <AddEntryModal
          onAdd={handleAddEntry}
          onCancel={() => setShowAddEntry(false)}
        />
      )}
    </div>
  );
}

// Supporting Modal Components
function RegisterVaultModal({ onRegister, onCancel }: {
  onRegister: (pin: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Register New Vault</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a secure vault protected by your PIN. Your PIN will be protected by OpenADP's distributed network.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Choose Your PIN (4+ digits)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              minLength={4}
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onRegister(pin)}
              disabled={pin.length < 4}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Vault
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PinPromptModal({ onUnlock, onCancel }: {
  onUnlock: (pin: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Enter PIN to Unlock Vault</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter your PIN to decrypt your vault entries and enable frictionless adding.
        </p>
        <div className="space-y-4">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && pin && onUnlock(pin)}
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onUnlock(pin)}
              disabled={!pin}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Unlock Vault
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddEntryModal({ onAdd, onCancel }: {
  onAdd: (name: string, secret: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Entry (No PIN Required!)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entry Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GitHub Recovery Codes"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret Data
            </label>
            <textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Paste your recovery codes here..."
              rows={6}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => onAdd(name, secret)}
              disabled={!name || !secret}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add Entry
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 