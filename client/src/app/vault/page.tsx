'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { openadp, crypto_service } from '@/lib/openadp';
import { VaultStatusResponse, ListEntriesResponse, GetEntriesResponse } from '@/../../shared/types/api';
import { useToast } from '@/components/ui/ToastContainer';
import EntryCard from '@/components/ui/EntryCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Shield, Plus, Lock, Key, Trash2, UserX } from 'lucide-react';

interface VaultEntry {
  name: string;
  hpkeBlob: string;
  decryptedSecret?: string;
  isDecrypting?: boolean;
}

export default function VaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  const [vaultStatus, setVaultStatus] = useState<VaultStatusResponse | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [showRegisterVault, setShowRegisterVault] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
    const checkPublicKey = async () => {
      const { hasLocalPublicKey } = await import('@/lib/openadp');
      const hasKey = await hasLocalPublicKey();
      setIsUnlocked(hasKey);
      console.log('🔍 Initial state check:', { hasLocalPublicKey: hasKey });
    };
    checkPublicKey();
    // Note: Private key is only stored in memory during the session
    // After page reload, user needs to enter PIN again to view secrets
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
      showError('Failed to load vault', 'Could not load vault data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVault = async (pin: string) => {
    try {
      setActionLoading(true);
      
      // SECURITY: Client handles ALL OpenADP operations directly
      const { metadata, privateKey } = await openadp.registerNewVault(session!.serverUser!.user_id, pin);
      
      // Register with server
      const registrationPayload = {
        pin: pin,
        openadp_metadata: metadata
      };
      
      await apiClient.post('/api/vault/register', registrationPayload);
      
      // SECURITY: Store private key in memory for decryption
      setPrivateKey(privateKey);
      setHasPrivateKey(true);
      setIsUnlocked(true);
      
      // Reload vault data
      await loadVaultData();
      setShowRegisterVault(false);
      
      showSuccess('Vault created successfully!', 'Your secure vault is now ready to use.');
    } catch (error) {
      console.error('❌ Vault registration failed:', error);
      showError('Failed to create vault', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockVault = async (pin: string) => {
    try {
      setActionLoading(true);
      
      // Get metadata from server
      const recoverResponse = await apiClient.post<{ success: boolean; openadp_metadata: string }>('/api/vault/recover', { pin });
      
      if (!recoverResponse.openadp_metadata) {
        throw new Error('No vault metadata returned from server');
      }
      
      // SECURITY: Client handles OpenADP recovery directly
      const { privateKey, remaining } = await openadp.recoverVaultKey(
        recoverResponse.openadp_metadata,
        pin
      );
      
      // Store private key in memory for decryption
      setPrivateKey(privateKey);
      setHasPrivateKey(true);
      setIsUnlocked(true);
      setShowPinPrompt(false);
      
      // Reload entries after successful unlock
      await loadVaultData();
      
      showSuccess('Vault unlocked successfully!', `${remaining} attempts remaining`);
    } catch (error) {
      console.error('❌ Failed to unlock vault:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid PIN')) {
          showError('Wrong PIN', error.message);
        } else if (error.message.includes('locked')) {
          showError('Account locked', 'Too many failed attempts. Please try again later.');
        } else {
          showError('Failed to unlock vault', error.message);
        }
      } else {
        showError('Failed to unlock vault', 'Please check your PIN and try again.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecryptEntry = async (entryIndex: number) => {
    if (!privateKey) {
      showWarning('PIN required', 'Please enter your PIN first to decrypt entries.');
      return;
    }

    try {
      // Set decrypting state
      setEntries(prev => prev.map((entry, index) => 
        index === entryIndex ? { ...entry, isDecrypting: true } : entry
      ));

      const entry = entries[entryIndex];
      const { secret } = await crypto_service.decryptEntry(entry.hpkeBlob, privateKey);
      
      // Update the specific entry with decrypted secret
      setEntries(prev => prev.map((entry, index) => 
        index === entryIndex 
          ? { ...entry, decryptedSecret: secret, isDecrypting: false }
          : entry
      ));
    } catch (error) {
      console.error('Failed to decrypt entry:', error);
      showError('Failed to decrypt entry', 'Please try again.');
      
      // Clear decrypting state on error
      setEntries(prev => prev.map((entry, index) => 
        index === entryIndex ? { ...entry, isDecrypting: false } : entry
      ));
    }
  };

  const handleAddEntry = async (name: string, secret: string) => {
    try {
      setActionLoading(true);
      
      // Check if we have a locally stored public key
      const { hasLocalPublicKey } = await import('@/lib/openadp');
      if (!(await hasLocalPublicKey())) {
        showWarning('PIN required', 'Please enter your PIN to unlock vault first.');
        setShowPinPrompt(true);
        return;
      }
      
      // Encrypt entry
      const { hpkeBlob, deletionHash } = await crypto_service.encryptEntry(name, secret);
      
      // Add to server
      await apiClient.post('/api/entries', {
        name,
        hpke_blob: hpkeBlob,
        deletion_hash: deletionHash
      });
      
      // Reload entries and close modal
      await loadVaultData();
      setShowAddEntry(false);
      
      showSuccess('Entry added successfully!', `"${name}" has been securely stored.`);
    } catch (error) {
      console.error('Failed to add entry:', error);
      showError('Failed to add entry', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEntry = async (name: string) => {
    try {
      setActionLoading(true);
      
      if (!privateKey) {
        showWarning('PIN required', 'Please enter your PIN to unlock vault operations.');
        setShowPinPrompt(true);
        return;
      }
      
      // Find the entry to delete
      const entry = entries.find(e => e.name === name);
      if (!entry) {
        throw new Error('Entry not found');
      }
      
      // Extract deletion pre-hash from encrypted entry
      const { getDeletionPreHash } = await import('@/lib/hpke.js');
      const { deletionPreHash } = await getDeletionPreHash(entry.hpkeBlob, privateKey);
      
      // Send delete request
      await apiClient.delete('/api/entries', {
        name,
        deletion_pre_hash: deletionPreHash
      });
      
      // Reload entries
      await loadVaultData();
      
      showSuccess('Entry deleted successfully!', `"${name}" has been permanently removed.`);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      showError('Failed to delete entry', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHideSecret = (index: number) => {
    setEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, decryptedSecret: undefined } : entry
    ));
  };

  const handleLockVault = async () => {
    const { lockVault } = await import('@/lib/openadp');
    await lockVault();
    
    setPrivateKey(null);
    setHasPrivateKey(false);
    
    // Remove decrypted secrets from entries
    setEntries(entries.map(entry => ({ 
      name: entry.name, 
      hpkeBlob: entry.hpkeBlob,
    })));
    
    showInfo('Vault locked', 'You can still add entries, but need PIN to view secrets.');
  };

  const handleDeleteAccount = async () => {
    try {
      setActionLoading(true);

      // Call server to delete account
      await apiClient.delete('/api/user/delete');

      // Clear all local storage and cached data
      const { clearAllKeys } = await import('@/lib/openadp');
      await clearAllKeys();
      localStorage.removeItem('jwt_token');

      // Force logout
      await signOut({ redirect: true, callbackUrl: '/login' });
      
    } catch (error) {
      console.error('❌ Failed to delete account:', error);
      showError('Failed to delete account', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
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
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">eVault</h1>
                <p className="text-xs text-gray-500">Secure Vault</p>
              </div>
            </div>
            <nav className="hidden sm:flex space-x-6">
              <a href="/" className="text-gray-500 hover:text-gray-900">Home</a>
              <a href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</a>
              <span className="text-blue-600 font-medium">Vault</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                  <span className="text-sm text-gray-600">Level 1 - Can Add Entries:</span>
                  <span className={`ml-2 text-sm font-medium ${isUnlocked ? 'text-green-600' : 'text-red-600'}`}>
                    {isUnlocked ? '✓ Yes (Public Key Available)' : '✗ No (Need PIN)'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">Level 2 - Can View Secrets:</span>
                  <span className={`ml-2 text-sm font-medium ${hasPrivateKey ? 'text-green-600' : 'text-orange-600'}`}>
                    {hasPrivateKey ? '✓ Yes (Private Key in Memory)' : '✗ No (Need PIN)'}
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
              
              {vaultStatus?.has_vault && isUnlocked && !hasPrivateKey && (
                <button
                  onClick={() => setShowPinPrompt(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                >
                  Enter PIN to View Secrets
                </button>
              )}
              
              {hasPrivateKey && (
                <button
                  onClick={handleLockVault}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                >
                  Lock Vault (Clear Private Key)
                </button>
              )}
              
              {/* Delete Account - Always available for account management */}
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Delete Account
              </button>
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
                  disabled={!isUnlocked}
                >
                  Add Entry {!isUnlocked ? '(PIN Required)' : ''}
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
                            <div className="mt-2">
                              <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                {entry.decryptedSecret}
                              </pre>
                              <button
                                onClick={() => {
                                  // Hide the decrypted secret
                                  setEntries(prev => prev.map((e, i) => 
                                    i === index ? { ...e, decryptedSecret: undefined } : e
                                  ));
                                }}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                              >
                                🙈 Hide Secret
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center space-x-2">
                              <span className="text-sm text-gray-500">🔒 Encrypted</span>
                              {hasPrivateKey && (
                                <button
                                  onClick={() => handleDecryptEntry(index)}
                                  disabled={entry.isDecrypting}
                                  className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 flex items-center space-x-1"
                                >
                                  {entry.isDecrypting ? (
                                    <>
                                      <span className="animate-spin">⏳</span>
                                      <span>Decrypting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>👁️</span>
                                      <span>View Secret</span>
                                    </>
                                  )}
                                </button>
                              )}
                              {!hasPrivateKey && (
                                <button
                                  onClick={() => setShowPinPrompt(true)}
                                  className="text-sm text-orange-600 hover:text-orange-800 underline"
                                >
                                  Enter PIN to view
                                </button>
                              )}
                            </div>
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