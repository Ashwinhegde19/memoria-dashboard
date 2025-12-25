import React, { useState } from 'react';
import { Icon } from './Icons';
import { createSyncCredentials, verifySyncPassword, syncCodeExists } from '../services/supabaseService';

interface SyncCodeModalProps {
  onClose: () => void;
  onSync: (syncCode: string, password: string) => void;
  currentCode: string | null;
}

// Generate a random sync code like "ABC-1234-DEFG" (longer for security)
const generateSyncCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  
  const randomChar = () => chars[Math.floor(Math.random() * chars.length)];
  const randomNum = () => nums[Math.floor(Math.random() * nums.length)];
  
  const part1 = randomChar() + randomChar() + randomChar();
  const part2 = randomNum() + randomNum() + randomNum() + randomNum();
  const part3 = randomChar() + randomChar() + randomChar() + randomChar();
  
  return `${part1}-${part2}-${part3}`;
};

// Simple hash function for password (client-side)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const SyncCodeModal: React.FC<SyncCodeModalProps> = ({ onClose, onSync, currentCode }) => {
  const [mode, setMode] = useState<'menu' | 'new' | 'existing'>(currentCode ? 'menu' : 'menu');
  const [inputCode, setInputCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateNew = () => {
    const code = generateSyncCode();
    setGeneratedCode(code);
    setPassword('');
    setConfirmPassword('');
    setMode('new');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseGeneratedCode = async () => {
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const hashedPassword = await hashPassword(password);
      
      // Save credentials to Supabase
      await createSyncCredentials(generatedCode, hashedPassword);
      
      onSync(generatedCode, hashedPassword);
      onClose();
    } catch (err) {
      console.error('Failed to create sync:', err);
      setError('Failed to create sync. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseExistingCode = async () => {
    const cleanCode = inputCode.toUpperCase().trim();
    if (!/^[A-Z]{3}-\d{4}-[A-Z]{4}$/.test(cleanCode)) {
      setError('Invalid format. Use: ABC-1234-DEFG');
      return;
    }
    if (password.length < 4) {
      setError('Enter your password');
      return;
    }
    
    setLoading(true);
    try {
      // Check if sync code exists
      const exists = await syncCodeExists(cleanCode);
      if (!exists) {
        setError('Sync code not found');
        setLoading(false);
        return;
      }
      
      // Verify password
      const hashedPassword = await hashPassword(password);
      const valid = await verifySyncPassword(cleanCode, hashedPassword);
      
      if (!valid) {
        setError('Incorrect password');
        setLoading(false);
        return;
      }
      
      onSync(cleanCode, hashedPassword);
      onClose();
    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('MEMORIA_SYNC_CODE');
    localStorage.removeItem('MEMORIA_SYNC_HASH');
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
              <Icon name="shield" className="w-5 h-5 text-emerald-500" />
              Sync Connected
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
          </div>
          
          <div className="text-center py-4">
            <p className="text-slate-400 text-sm mb-3">Your sync code:</p>
            <div className="bg-black/50 border border-emerald-500/30 rounded-lg p-4 font-mono text-2xl text-emerald-400 tracking-widest">
              {currentCode}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Icon name="lock" className="w-3 h-3 text-emerald-500" />
              <p className="text-emerald-500 text-xs">Password protected</p>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              Use this code + password on other devices
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
            <Icon name="shield" className="w-5 h-5 text-fuchsia-500" />
            {mode === 'menu' ? 'Secure Cloud Sync' : mode === 'new' ? 'Create New Sync' : 'Join Existing Sync'}
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
                  <p className="text-xs text-slate-400">Generate a new code with password protection</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => { setMode('existing'); setPassword(''); setError(null); }}
              className="w-full p-4 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-500/30 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500/20 p-2 rounded">
                  <Icon name="server" className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Join Existing Sync</p>
                  <p className="text-xs text-slate-400">Enter code + password from another device</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'new' && (
          <div className="py-4">
            <p className="text-slate-400 text-sm mb-4 text-center">Your new sync code:</p>
            <div 
              className="bg-black/50 border border-fuchsia-500/30 rounded-lg p-4 font-mono text-xl text-fuchsia-400 tracking-widest cursor-pointer hover:border-fuchsia-400 transition-colors text-center"
              onClick={handleCopyCode}
            >
              {generatedCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="mt-2 text-xs text-slate-400 hover:text-white flex items-center gap-1 mx-auto"
            >
              {copied ? '✓ Copied!' : 'Click to copy'}
            </button>
            
            <div className="mt-6 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Create Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="w-full bg-black border border-slate-800 rounded p-2.5 text-white focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className="w-full bg-black border border-slate-800 rounded p-2.5 text-white focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500 outline-none"
                />
              </div>
            </div>
            
            {error && (
              <p className="text-red-400 text-xs mt-3 text-center">{error}</p>
            )}
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Back
              </button>
              <button
                onClick={handleUseGeneratedCode}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded font-bold text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Icon name="lock" className="w-4 h-4" />
                    Create Sync
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {mode === 'existing' && (
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Sync Code
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="ABC-1234-DEFG"
                className="w-full bg-black border border-slate-800 rounded p-3 text-white text-center font-mono text-lg tracking-widest focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none placeholder:text-slate-700"
                maxLength={13}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                className="w-full bg-black border border-slate-800 rounded p-2.5 text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
            </div>
            
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
            
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Back
              </button>
              <button
                onClick={handleUseExistingCode}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-bold text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Icon name="lock" className="w-4 h-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export helper to get/set sync code and password hash
export const getSyncCode = (): string | null => {
  return localStorage.getItem('MEMORIA_SYNC_CODE');
};

export const getSyncHash = (): string | null => {
  return localStorage.getItem('MEMORIA_SYNC_HASH');
};

export const setSyncCode = (code: string): void => {
  localStorage.setItem('MEMORIA_SYNC_CODE', code);
};

export const setSyncHash = (hash: string): void => {
  localStorage.setItem('MEMORIA_SYNC_HASH', hash);
};
