import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';

interface SyncCodeModalProps {
  onClose: () => void;
  onSync: (syncCode: string) => void;
  currentCode: string | null;
}

// Generate a random sync code like "ABC-123-XYZ"
const generateSyncCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars like I, O
  const nums = '23456789'; // Removed confusing chars like 0, 1
  
  const randomChar = () => chars[Math.floor(Math.random() * chars.length)];
  const randomNum = () => nums[Math.floor(Math.random() * nums.length)];
  
  const part1 = randomChar() + randomChar() + randomChar();
  const part2 = randomNum() + randomNum() + randomNum();
  const part3 = randomChar() + randomChar() + randomChar();
  
  return `${part1}-${part2}-${part3}`;
};

export const SyncCodeModal: React.FC<SyncCodeModalProps> = ({ onClose, onSync, currentCode }) => {
  const [mode, setMode] = useState<'menu' | 'new' | 'existing'>(currentCode ? 'menu' : 'menu');
  const [inputCode, setInputCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateNew = () => {
    const code = generateSyncCode();
    setGeneratedCode(code);
    setMode('new');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseGeneratedCode = () => {
    onSync(generatedCode);
    onClose();
  };

  const handleUseExistingCode = () => {
    const cleanCode = inputCode.toUpperCase().trim();
    if (!/^[A-Z]{3}-\d{3}-[A-Z]{3}$/.test(cleanCode)) {
      setError('Invalid format. Use: ABC-123-XYZ');
      return;
    }
    onSync(cleanCode);
    onClose();
  };

  const handleDisconnect = () => {
    localStorage.removeItem('MEMORIA_SYNC_CODE');
    onClose();
    window.location.reload();
  };

  // If already connected, show status
  if (currentCode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-lg w-full max-w-md p-6 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Icon name="activity" className="w-5 h-5 text-emerald-500" />
              Sync Connected
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
          </div>
          
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-3">Your sync code:</p>
            <div className="bg-black/50 border border-emerald-500/30 rounded-lg p-4 font-mono text-2xl text-emerald-400 tracking-widest">
              {currentCode}
            </div>
            <p className="text-slate-500 text-xs mt-3">
              Use this code on other devices to sync your data
            </p>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDisconnect}
              className="flex-1 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-800/50 text-sm font-medium"
            >
              Disconnect
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-lg w-full max-w-md p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon name="activity" className="w-5 h-5 text-fuchsia-500" />
            {mode === 'menu' ? 'Cloud Sync' : mode === 'new' ? 'New Sync Code' : 'Enter Sync Code'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        {mode === 'menu' && (
          <div className="space-y-4">
            <button
              onClick={handleGenerateNew}
              className="w-full p-4 bg-fuchsia-900/20 hover:bg-fuchsia-900/40 border border-fuchsia-500/30 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-fuchsia-500/20 p-2 rounded">
                  <Icon name="sparkles" className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Create New Sync</p>
                  <p className="text-xs text-slate-400">Generate a new code for this device</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setMode('existing')}
              className="w-full p-4 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/30 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded">
                  <Icon name="server" className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Join Existing Sync</p>
                  <p className="text-xs text-slate-400">Enter a code from another device</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'new' && (
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-4">Your new sync code:</p>
            <div 
              className="bg-black/50 border border-fuchsia-500/30 rounded-lg p-4 font-mono text-2xl text-fuchsia-400 tracking-widest cursor-pointer hover:border-fuchsia-400 transition-colors"
              onClick={handleCopyCode}
            >
              {generatedCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="mt-3 text-xs text-slate-400 hover:text-white flex items-center gap-1 mx-auto"
            >
              {copied ? '✓ Copied!' : 'Click to copy'}
            </button>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Back
              </button>
              <button
                onClick={handleUseGeneratedCode}
                className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded font-bold text-sm"
              >
                Start Sync
              </button>
            </div>
          </div>
        )}

        {mode === 'existing' && (
          <div className="py-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Enter Sync Code
            </label>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="ABC-123-XYZ"
              className="w-full bg-black border border-slate-800 rounded p-3 text-white text-center font-mono text-xl tracking-widest focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder:text-slate-700"
              maxLength={11}
            />
            
            {error && (
              <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Back
              </button>
              <button
                onClick={handleUseExistingCode}
                className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-sm"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export helper to get/set sync code
export const getSyncCode = (): string | null => {
  return localStorage.getItem('MEMORIA_SYNC_CODE');
};

export const setSyncCode = (code: string): void => {
  localStorage.setItem('MEMORIA_SYNC_CODE', code);
};
