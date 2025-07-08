'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Trash2, Lock, Key, Clock } from 'lucide-react';
import { useToast } from './ToastContainer';

interface EntryCardProps {
  entry: {
    name: string;
    hpkeBlob: string;
    decryptedSecret?: string;
    isDecrypting?: boolean;
  };
  index: number;
  hasPrivateKey: boolean;
  onDecrypt: (index: number) => void;
  onDelete: (name: string) => void;
  onShowPinPrompt: () => void;
  onHideSecret: (index: number) => void;
}

export default function EntryCard({
  entry,
  index,
  hasPrivateKey,
  onDecrypt,
  onDelete,
  onShowPinPrompt,
  onHideSecret,
}: EntryCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showSuccess, showError } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied to clipboard', 'Secret has been copied to your clipboard');
    } catch (error) {
      showError('Failed to copy', 'Could not copy to clipboard');
    }
  };

  const handleViewSecret = () => {
    if (hasPrivateKey) {
      onDecrypt(index);
    } else {
      onShowPinPrompt();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Key className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 break-words">
                {entry.name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <Lock className="h-3 w-3 mr-1" />
                Encrypted
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {entry.decryptedSecret ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono break-words">
                {entry.decryptedSecret}
              </pre>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => copyToClipboard(entry.decryptedSecret!)}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Secret
              </button>
              
              <button
                onClick={() => onHideSecret(index)}
                className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Secret
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                This entry is encrypted and requires your PIN to view
              </p>
            </div>
            
            <button
              onClick={handleViewSecret}
              disabled={entry.isDecrypting}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {entry.isDecrypting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Decrypting...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  {hasPrivateKey ? 'View Secret' : 'Enter PIN to View'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <Trash2 className="h-8 w-8 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Delete Entry</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "{entry.name}"? This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    onDelete(entry.name);
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 