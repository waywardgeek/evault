'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { openadp, crypto_service } from '@/lib/openadp';
import { VaultStatusResponse, ListEntriesResponse, GetEntriesResponse } from '@/../../shared/types/api';

interface VaultEntry {
  name: string;
  hpkeBlob: string;
  decryptedSecret?: string;
  isDecrypting?: boolean; // Track decryption state
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
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState(false);
  const [pendingDecryptIndex, setPendingDecryptIndex] = useState<number | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVault = async (pin: string) => {
    try {
      console.log('🚀 Starting vault registration process...');
      console.log(`📱 PIN length: ${pin.length}`);
      console.log(`👤 User ID: ${session?.serverUser?.user_id}`);
      
      setLoading(true);
      
      // SECURITY: Client handles ALL OpenADP operations directly
      console.log('🔄 Calling OpenADP registration...');
      const { metadata, privateKey } = await openadp.registerNewVault(session!.serverUser!.user_id, pin);
      
      console.log('✅ OpenADP registration completed successfully');
      console.log(`📦 Metadata length: ${metadata.length} characters`);
      console.log(`📦 Metadata preview: ${metadata.substring(0, 100)}...`);
      console.log(`🔑 Private key received: ${privateKey.length} bytes`);
      
      // Register with server - SECURITY: Only send metadata, no OpenADP calls by server
      console.log('🌐 Sending registration data to server...');
      const registrationPayload = {
        pin: pin, // Server validates PIN but doesn't call OpenADP
        openadp_metadata: metadata
      };
      console.log(`📤 Payload: pin=${pin.length} chars, metadata=${metadata.length} chars`);
      
      const serverResponse = await apiClient.post('/api/vault/register', registrationPayload);
      
      console.log('✅ Server registration completed successfully');
      console.log(`📥 Server response:`, serverResponse);
      
      // SECURITY: Store private key in memory for decryption (Level 2 authentication)
      setPrivateKey(privateKey);
      setHasPrivateKey(true);
      
      // SECURITY: Public key is now stored locally during OpenADP registration (Level 1 authentication)
      setIsUnlocked(true);
      
      // Reload vault data to show the new vault status
      console.log('🔄 Reloading vault data...');
      await loadVaultData();
      
      // Note: Don't automatically decrypt entries - user can decrypt on-demand with View button
      console.log('✅ Vault registered successfully - private key available for on-demand decryption');
      
      setShowRegisterVault(false);
      
      console.log('🎉 Vault registration completed successfully!');
    } catch (error) {
      console.error('❌ Vault registration failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        error: error
      });
      alert(`Failed to register vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockVault = async (pin: string) => {
    try {
      setLoading(true);
      
      console.log('🔓 Starting vault unlock process...');
      console.log(`📱 PIN: ${pin}`);
      
      // SECURITY: Get metadata from server, but client handles OpenADP recovery
      console.log('🌐 Requesting metadata from server...');
      const recoverResponse = await apiClient.post<{ success: boolean; openadp_metadata: string }>('/api/vault/recover', { pin });
      
      console.log('📥 Server response:', recoverResponse);
      
      if (!recoverResponse.openadp_metadata) {
        throw new Error('No vault metadata returned from server');
      }
      
      console.log(`📦 Metadata received: ${recoverResponse.openadp_metadata.length} characters`);
      console.log(`📦 Metadata preview: ${recoverResponse.openadp_metadata.substring(0, 100)}...`);
      
      // SECURITY: Client handles OpenADP recovery directly - no server OpenADP calls
      console.log('🔄 Calling OpenADP recovery...');
      let privateKey, remaining;
      try {
        const result = await openadp.recoverVaultKey(
          recoverResponse.openadp_metadata,
          pin
        );
        privateKey = result.privateKey;
        remaining = result.remaining;
        
        console.log('✅ OpenADP recovery successful');
        console.log(`🔑 Private key recovered: ${privateKey.length} bytes`);
        console.log(`⚠️ Remaining attempts: ${remaining}`);
      } catch (openadpError: any) {
        console.error('❌ OpenADP recovery failed:', openadpError);
        // Check if it's just a backup refresh failure - we might still have the private key
        if (openadpError.message && openadpError.message.includes('backup') && openadpError.privateKey) {
          console.log('⚠️ Backup refresh failed but private key recovered - continuing anyway');
          privateKey = openadpError.privateKey;
          remaining = openadpError.remaining || 'unknown';
        } else {
          throw openadpError; // Re-throw if it's a real failure  
        }
      }
      
      // Store private key in memory for decryption (Level 2 authentication)
      setPrivateKey(privateKey);
      setHasPrivateKey(true);
      
      // SECURITY: Public key is now stored locally during OpenADP recovery (Level 1 authentication)
      setIsUnlocked(true);
      setShowPinPrompt(false);
      
      // Auto-decrypt the entry that originally triggered the PIN prompt
      if (pendingDecryptIndex !== null) {
        // Use the privateKey directly instead of relying on state
        const entry = entries[pendingDecryptIndex];
        if (entry) {
          try {
            const { secret } = await crypto_service.decryptEntry(entry.hpkeBlob, privateKey);
            
            // Update the specific entry with decrypted secret
            setEntries(prev => prev.map((entry, index) => 
              index === pendingDecryptIndex 
                ? { ...entry, decryptedSecret: secret, isDecrypting: false }
                : entry
            ));
            
            console.log(`✅ Successfully auto-decrypted entry: ${entry.name}`);
          } catch (error) {
            console.error('Failed to auto-decrypt entry:', error);
          }
        }
        setPendingDecryptIndex(null);
      }
      
      // Note: Don't automatically decrypt entries - user can decrypt on-demand with View button
      console.log('✅ Vault unlocked successfully - private key available for on-demand decryption');
    } catch (error) {
      console.error('❌ Failed to unlock vault:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        error: error
      });
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid PIN')) {
          alert(`Wrong PIN. ${error.message}`);
        } else if (error.message.includes('locked')) {
          alert('Account locked due to too many failed attempts. Please try again later.');
        } else if (error.message.includes('metadata')) {
          alert('Vault metadata issue. You may need to re-register your vault.');
        } else {
          alert(`Failed to unlock vault: ${error.message}`);
        }
      } else {
        alert('Failed to unlock vault. Please check your PIN and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Decrypt individual entry on-demand
  const handleDecryptEntry = async (entryIndex: number) => {
    if (!privateKey) {
      // Remember which entry the user wants to decrypt
      setPendingDecryptIndex(entryIndex);
      setShowPinPrompt(true);
      return;
    }

    try {
      // Set decrypting state
      setEntries(prev => prev.map((entry, index) => 
        index === entryIndex ? { ...entry, isDecrypting: true } : entry
      ));

      const entry = entries[entryIndex];
      console.log(`🔓 Decrypting entry: ${entry.name}`);
      
      const { secret } = await crypto_service.decryptEntry(entry.hpkeBlob, privateKey);
      
      // Update the specific entry with decrypted secret
      setEntries(prev => prev.map((entry, index) => 
        index === entryIndex 
          ? { ...entry, decryptedSecret: secret, isDecrypting: false }
          : entry
      ));

      console.log(`✅ Successfully decrypted entry: ${entry.name}`);
    } catch (error) {
      console.error('Failed to decrypt entry:', error);
      alert('Failed to decrypt entry. Please try again.');
      
      // Clear decrypting state on error
      setEntries(prev => prev.map((entry, index) => 
        index === entryIndex ? { ...entry, isDecrypting: false } : entry
      ));
    }
  };

  const handleAddEntry = async (name: string, secret: string) => {
    try {
      setLoading(true);
      
      // Check if we have a locally stored public key (new HPKE implementation)
      const { hasLocalPublicKey } = await import('@/lib/openadp');
      if (!(await hasLocalPublicKey())) {
        alert('No public key available. Please enter your PIN to unlock vault first.');
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
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert(`Failed to add entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      setLoading(true);
      
      // Get private key for decryption
      if (!privateKey) {
        alert('Private key not available. Please enter your PIN to unlock vault operations.');
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
      
      // Send delete request with proper deletion pre-hash
      await apiClient.delete('/api/entries', {
        name,
        deletion_pre_hash: deletionPreHash
      });
      
      // Reload entries
      await loadVaultData();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert(`Failed to delete entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLockVault = async () => {
    // Clear private key from memory (Level 2 authentication)
    // PUBLIC KEY STAYS in localStorage for adding entries!
    const { lockVault } = await import('@/lib/openadp');
    await lockVault(); // Only clears private key from memory
    
    setPrivateKey(null);
    setHasPrivateKey(false);
    // Note: isUnlocked stays true because public key remains for adding entries
    
    // Remove decrypted secrets from entries (keep encrypted blobs)
    setEntries(entries.map(entry => ({ 
      name: entry.name, 
      hpkeBlob: entry.hpkeBlob,
      // Remove decryptedSecret and isDecrypting properties
    })));
    
    console.log('🔒 Vault locked - can still add entries, but need PIN to view/delete');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-8">
          {/* Beautiful Status Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 mb-6">
            <div className="flex items-center justify-end mb-6">
              <div className="flex items-center space-x-4">
                {/* Vault Status Badge */}
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  vaultStatus?.has_vault 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {vaultStatus?.has_vault ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Not Set Up</span>
                    </>
                  )}
                </div>

                {/* Add Entries Badge */}
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isUnlocked 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{isUnlocked ? 'Can Add' : 'Need PIN'}</span>
                </div>

                {/* View Secrets Badge */}
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  hasPrivateKey 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <span>{hasPrivateKey ? 'Can View' : 'Need PIN'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {!vaultStatus?.has_vault && (
                <button
                  onClick={() => setShowRegisterVault(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  <span>Set Up Vault</span>
                </button>
              )}
              
              {vaultStatus?.has_vault && !isUnlocked && (
                <button
                  onClick={() => setShowPinPrompt(true)}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Unlock Vault</span>
                </button>
              )}
              

              
              {hasPrivateKey && (
                <button
                  onClick={handleLockVault}
                  className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Lock Vault</span>
                </button>
              )}
            </div>
          </div>

          {/* Beautiful Entry List */}
          {vaultStatus?.has_vault && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
              {/* Header with Add Button */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Your Secrets ({entries.length})
                  </h2>
                  <button
                    onClick={() => setShowAddEntry(true)}
                    disabled={!isUnlocked}
                    className="flex items-center space-x-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span>Add Entry</span>
                  </button>
                </div>
              </div>

              {/* Entry List */}
              <div className="divide-y divide-gray-100">
                {entries.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-500 text-lg">No entries yet</p>
                    <p className="text-gray-400 text-sm mt-1">Add your first recovery codes to get started</p>
                  </div>
                ) : (
                  entries.map((entry, index) => (
                    <div key={index} className="group hover:bg-gray-50/50 transition-colors">
                      <div className="px-6 py-4">
                        {/* Entry Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{entry.name}</h3>
                              <p className="text-sm text-gray-500">
                                {entry.decryptedSecret ? 'Decrypted' : 'Encrypted'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* View/Hide Secret Button */}
                            {entry.decryptedSecret ? (
                              <button
                                onClick={() => {
                                  setEntries(prev => prev.map((e, i) => 
                                    i === index ? { ...e, decryptedSecret: undefined } : e
                                  ));
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Hide secret"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDecryptEntry(index)}
                                disabled={entry.isDecrypting}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                                title={hasPrivateKey ? "View secret" : "Enter PIN to view"}
                              >
                                {entry.isDecrypting ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            )}

                            {/* Copy Button - only show when decrypted */}
                            {entry.decryptedSecret && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(entry.decryptedSecret || '');
                                  // You could add a toast notification here
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Copy to clipboard"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2V5a2 2 0 00-2-2v8z" />
                                </svg>
                              </button>
                            )}

                            {/* Delete Button - only show when PIN available */}
                            {hasPrivateKey && (
                              <button
                                onClick={() => handleDeleteEntry(entry.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete entry"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Smart Secret Display */}
                        {entry.decryptedSecret && (
                          <div className="mt-4 animate-fadeIn">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              {entry.decryptedSecret.length > 100 || entry.decryptedSecret.includes('\n') ? (
                                // Long/multi-line secrets get expandable display
                                <div>
                                  <div className="text-sm text-gray-600 mb-2">Secret content:</div>
                                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border max-h-32 overflow-y-auto">
                                    {entry.decryptedSecret}
                                  </pre>
                                </div>
                              ) : (
                                // Short secrets get inline display
                                <div className="flex items-center justify-between">
                                  <code className="text-sm text-gray-800 bg-white px-2 py-1 rounded border">
                                    {entry.decryptedSecret}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
            onCancel={() => {
              setShowPinPrompt(false);
              setPendingDecryptIndex(null);
            }}
          />
        )}

        {showAddEntry && (
          <AddEntryModal
            onAdd={handleAddEntry}
            onCancel={() => setShowAddEntry(false)}
          />
        )}
      </div>
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
              autoComplete="new-password"
              data-form-type="other"
              data-lpignore="true"
              role="presentation"
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => onRegister(pin)}
              disabled={pin.length < 4}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Vault
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
              autoComplete="new-password"
              data-form-type="other"
              data-lpignore="true"
              role="presentation"
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => onUnlock(pin)}
              disabled={!pin}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Unlock Vault
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
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdd(name, secret)}
              disabled={!name || !secret}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 