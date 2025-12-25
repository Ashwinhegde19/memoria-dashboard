import React, { useState, useEffect, useRef } from 'react';
import { Brain, Device, LogEntry, NavigationTab, SectorZone, SyncState } from './types';
import { Icon } from './components/Icons';
import { BrainCard } from './components/BrainCard';
import { BrainDetail } from './components/BrainDetail';
import { NetworkGraph } from './components/NetworkGraph';
import { SyncCodeModal, getSyncCode, setSyncCode, getSyncHash, setSyncHash } from './components/SyncCodeModal';
import { fetchSystemState, formatBytes, getApiConfig, saveApiConfig } from './services/mockData';
import { 
  isSupabaseConfigured, 
  saveBrainToCloud, 
  getBrainsFromCloud,
  CloudBrain 
} from './services/supabaseService';

function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>(NavigationTab.DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sync Code State (replaces auth)
  const [syncCode, setSyncCodeState] = useState<string | null>(getSyncCode());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudBrains, setCloudBrains] = useState<CloudBrain[]>([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState<SectorZone | 'all'>('all');
  
  // Local File System Handle Ref
  // Using FileSystemDirectoryHandle type from File System Access API
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  
  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiConfig());

  // Dynamic State
  const [brains, setBrains] = useState<Brain[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [networkData, setNetworkData] = useState<{ time: string; mbps: number }[]>([]);
  
  // Selected brain for detail view
  const [selectedBrain, setSelectedBrain] = useState<Brain | null>(null);
  
  // Filtered brains based on search and zone filter
  const filteredBrains = brains.filter(brain => {
    const matchesSearch = searchQuery === '' || 
      brain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brain.localPath.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = filterZone === 'all' || brain.zone === filterZone;
    return matchesSearch && matchesZone;
  });
  
  // Load cloud brains when sync code is set
  useEffect(() => {
    if (syncCode) {
      loadCloudBrains();
    }
  }, [syncCode]);
  
  // Handle sync code change from modal
  const handleSyncCodeChange = (code: string, passwordHash: string) => {
    setSyncCode(code); // Save to localStorage
    setSyncHash(passwordHash); // Save password hash
    setSyncCodeState(code); // Update state
  };
  
  // Load cloud brains for current sync code
  const loadCloudBrains = async () => {
    if (!syncCode) return;
    try {
      const brains = await getBrainsFromCloud(syncCode);
      setCloudBrains(brains);
    } catch (err) {
      console.error('Failed to load cloud brains:', err);
    }
  };
  
  // Helper: Collect all files from a directory handle
  const collectFilesFromDirectory = async (
    handle: FileSystemDirectoryHandle,
    basePath = ''
  ): Promise<Array<{ path: string; content: Blob }>> => {
    const files: Array<{ path: string; content: Blob }> = [];
    const IGNORED_FOLDERS = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
    const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);
    
    for await (const entry of handle.values()) {
      const name = entry.name;
      if (IGNORED_FILES.has(name)) continue;
      
      if (entry.kind === 'file') {
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const path = basePath ? `${basePath}/${name}` : name;
          files.push({ path, content: file });
        } catch (e) {
          console.error(`Failed to read file: ${name}`, e);
        }
      } else if (entry.kind === 'directory' && !IGNORED_FOLDERS.has(name)) {
        const dirHandle = entry as FileSystemDirectoryHandle;
        const subPath = basePath ? `${basePath}/${name}` : name;
        const subFiles = await collectFilesFromDirectory(dirHandle, subPath);
        files.push(...subFiles);
      }
    }
    
    return files;
  };
  
  // Sync local brains to cloud (with files)
  const handleSyncToCloud = async () => {
    if (!syncCode || brains.length === 0 || !dirHandleRef.current) return;
    
    setSyncing(true);
    let totalFiles = 0;
    let uploadedFiles = 0;
    
    try {
      // Import file upload function
      const { uploadFilesToCloud } = await import('./services/supabaseService');
      
      for (const brain of brains) {
        // Save brain metadata
        try {
          await saveBrainToCloud(syncCode, {
            name: brain.name,
            zone: brain.zone,
            localPath: brain.localPath,
            massBytes: brain.massBytes,
            neuronCount: brain.neuronCount,
          });
        } catch (dbErr) {
          console.error('Failed to save brain metadata:', dbErr);
          setLogs(prev => [...prev, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            level: 'error',
            module: 'net',
            message: `Failed to save ${brain.name}: ${dbErr instanceof Error ? dbErr.message : 'Database error'}`
          }]);
          // Continue with other brains
        }
        
        // Try to get brain's directory handle and upload files
        try {
          const brainDirName = brain.localPath.replace('./', '');
          const brainHandle = await dirHandleRef.current.getDirectoryHandle(brainDirName);
          const files = await collectFilesFromDirectory(brainHandle);
          totalFiles += files.length;
          
          if (files.length > 0) {
            setLogs(prev => [...prev, {
              id: Date.now().toString(),
              timestamp: Date.now(),
              level: 'info',
              module: 'net',
              message: `Uploading ${files.length} files from ${brain.name}...`
            }]);
            
            const result = await uploadFilesToCloud(syncCode, brain.name, files, (progress) => {
              // Update log with progress
              console.log(`Uploading: ${progress.currentFile} (${progress.completed}/${progress.total})`);
            });
            
            uploadedFiles += result.uploaded;
            
            if (result.errors.length > 0) {
              setLogs(prev => [...prev, {
                id: Date.now().toString(),
                timestamp: Date.now(),
                level: 'warn',
                module: 'net',
                message: `${result.failed} files failed to upload`
              }]);
            }
          }
        } catch (e) {
          console.error(`Could not access directory for ${brain.name}`, e);
        }
      }
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        level: 'info',
        module: 'net',
        message: `Synced ${brains.length} brains, ${uploadedFiles}/${totalFiles} files uploaded`
      }]);
      
      await loadCloudBrains();
    } catch (err) {
      console.error('Sync failed:', err);
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        level: 'error',
        module: 'net',
        message: `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      }]);
    } finally {
      setSyncing(false);
    }
  };

  // Helper: Detect OS for Local Terminal display
  const getDetectedPlatform = (): 'macos' | 'linux' | 'windows' => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('win')) return 'windows';
    return 'linux';
  };

  // Helper to scan a directory recursively with SAFELIST
  const scanDirectoryRecursively = async (
    handle: FileSystemDirectoryHandle, 
    depth = 0
  ): Promise<{size: number, count: number}> => {
     // Safety breaker for very deep structures
     if (depth > 10) return { size: 0, count: 0 };

     const IGNORED_FOLDERS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage']);
     const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

     let size = 0;
     let count = 0;
     
     for await (const entry of handle.values()) {
        const name = entry.name;
        // Skip ignored items
        if (IGNORED_FILES.has(name)) continue;
        if (entry.kind === 'directory' && IGNORED_FOLDERS.has(name)) continue;

        if (entry.kind === 'file') {
           const fileHandle = entry as FileSystemFileHandle;
           const file = await fileHandle.getFile();
           size += file.size;
           count++;
        } else if (entry.kind === 'directory') {
           const dirHandle = entry as FileSystemDirectoryHandle;
           const sub = await scanDirectoryRecursively(dirHandle, depth + 1);
           size += sub.size;
           count += sub.count;
        }
     }
     return { size, count };
  };

  const processLocalMount = async (rootHandle: FileSystemDirectoryHandle): Promise<Brain[]> => {
      const newBrains: Brain[] = [];
      
      // DYNAMIC SCANNING:
      // Scan ALL folders in the mounted directory instead of looking for specific names
      const zones = [SectorZone.SINGULARITY, SectorZone.EVENT_HORIZON, SectorZone.DEEP_VOID];
      const zoneNames = ['Core Identity', 'Working Memory', 'Archive'];
      
      let folderIndex = 0;
      
      for await (const entry of rootHandle.values()) {
         if (entry.kind === 'directory') {
            const dirHandle = entry as FileSystemDirectoryHandle;
            const folderName = entry.name;
            
            // Skip hidden folders and common non-data folders
            if (folderName.startsWith('.') || folderName === 'node_modules') continue;
            
            try {
               const stats = await scanDirectoryRecursively(dirHandle);
               
               // Assign zones in order: first folder = Singularity, second = Event Horizon, etc.
               // After 3 folders, all additional folders get DEEP_VOID zone
               const zoneIndex = Math.min(folderIndex, zones.length - 1);
               
               newBrains.push({
                  id: `local_${folderName}`,
                  name: folderName,
                  zone: zones[zoneIndex],
                  localPath: `./${folderName}`,
                  massBytes: stats.size,
                  neuronCount: stats.count,
                  lastPulse: Date.now(),
                  state: stats.count > 0 ? SyncState.COHERENT : SyncState.STABILIZING,
                  generation: 1,
                  peers: [],
                  activeLock: undefined
               });
               
               folderIndex++;
            } catch (e) {
               console.error(`Failed to scan folder: ${folderName}`, e);
            }
         }
      }
      
      // If no folders found, show a helpful message
      if (newBrains.length === 0) {
         newBrains.push({
            id: 'local_empty',
            name: 'No Folders Found',
            zone: SectorZone.DEEP_VOID,
            localPath: './[empty]',
            massBytes: 0,
            neuronCount: 0,
            lastPulse: 0,
            state: SyncState.DECOHERENT,
            generation: 0,
            peers: []
         });
      }
      return newBrains;
  };

  const initSystem = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Try Local Mount
      if (dirHandleRef.current) {
        const localBrains = await processLocalMount(dirHandleRef.current);
        setBrains(localBrains);
        
        // Synthesize a local device
        setDevices([{
            id: 'local_host',
            name: 'Local Terminal',
            ip: '127.0.0.1',
            status: 'online',
            isSelf: true,
            platform: getDetectedPlatform()
        }]);
        setNetworkData([]); // No network data for local files
        
        setLogs(prev => [...prev, {
            id: Date.now().toString(),
            timestamp: Date.now(),
            level: 'info',
            module: 'fs',
            message: 'Local storage scanned successfully'
        }]);
        setIsConnected(true);
      } 
      // 2. Try API Uplink
      else if (getApiConfig()) {
        const state = await fetchSystemState();
        setDevices(state.devices);
        setBrains(state.brains);
        setLogs(state.logs);
        setNetworkData(state.networkData);
        setIsConnected(true);
      } 
      // 3. No Source
      else {
        setIsConnected(false);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      if (error.message === "NO_SOURCE") {
          setIsConnected(false);
      } else {
          console.error("Failed to load system state", error);
          setError(`Connection failure: ${error.message}`);
          setIsConnected(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSystem();
  }, []);

  const handleSaveSettings = () => {
    saveApiConfig(apiUrlInput);
    setShowSettings(false);
    window.location.reload();
  };

  // Mount Local Directory using File System Access API
  const handleMountLocal = async (): Promise<void> => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.");
        return;
      }
      
      // showDirectoryPicker is part of File System Access API
      const dirHandle = await (window as unknown as { 
        showDirectoryPicker: (options?: { 
          id?: string; 
          mode?: 'read' | 'readwrite'; 
          startIn?: string; 
        }) => Promise<FileSystemDirectoryHandle>; 
      }).showDirectoryPicker({
        id: 'antigravity_root',
        mode: 'read',
        startIn: 'documents'
      });
      
      dirHandleRef.current = dirHandle; // Store handle for resyncs
      setLoading(true);
      
      const newBrains = await processLocalMount(dirHandle);

      setBrains(newBrains);
      
      setDevices([{
        id: 'local_host',
        name: 'Local Terminal',
        ip: '127.0.0.1',
        status: 'online',
        isSelf: true,
        platform: getDetectedPlatform()
      }]);
      setNetworkData([]);

      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: Date.now(),
        level: 'info',
        module: 'fs',
        message: 'Local file system mounted successfully'
      }]);
      
      setIsConnected(true);

    } catch (err) {
       console.error("Mount cancelled or failed", err);
    } finally {
       setLoading(false);
    }
  };

  const renderContent = () => {
    if (error) {
       return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
          <div className="bg-red-950/30 border border-red-500/30 p-8 rounded-lg max-w-lg">
             <Icon name="server" className="w-12 h-12 text-red-500 mx-auto mb-4" />
             <h2 className="text-xl font-bold text-white mb-2">Connection Failure</h2>
             <p className="text-red-300/70 mb-6 font-mono text-sm">{error}</p>
             <button onClick={() => setShowSettings(true)} className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 border border-red-500/50 rounded text-red-200 text-sm font-medium transition-colors">
                 Configure Link
             </button>
          </div>
        </div>
       );
    }

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6 animate-fade-in">
                <div className="w-16 h-16 rounded bg-slate-800 flex items-center justify-center mb-6 shadow-2xl shadow-cyan-900/20">
                    <Icon name="activity" className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">System Idle</h2>
                <p className="text-slate-400 max-w-md mb-8">
                    No active memory context found. Mount your <code>~/.gemini/antigravity</code> folder to begin visualization.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleMountLocal}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-3 transition-all font-medium shadow-lg shadow-emerald-900/20"
                    >
                        <Icon name="folder" className="w-5 h-5" />
                        Mount Antigravity Root
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-lg flex items-center justify-center gap-3 transition-all font-medium border border-slate-700"
                    >
                        <Icon name="settings" className="w-5 h-5" />
                        Configure API
                    </button>
                </div>
                <p className="text-xs text-slate-600 mt-8 font-mono">Waiting for uplink...</p>
            </div>
        );
    }

    switch (activeTab) {
      case NavigationTab.DASHBOARD:
        const onlineCount = devices.filter(d => d.status === 'online').length;
        const totalMass = brains.reduce((acc, b) => acc + b.massBytes, 0);

        return (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-memoria-card border border-slate-700/50 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Icon name="server" className="w-16 h-16" /></div>
                <div className="bg-emerald-500/10 p-3 rounded-md text-emerald-400 border border-emerald-500/20">
                  <Icon name="activity" className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Mesh Stability</p>
                  <p className="text-2xl font-mono font-bold text-white">{onlineCount} <span className="text-slate-600 text-sm font-normal">/ {devices.length} Nodes</span></p>
                </div>
              </div>
              <div className="bg-memoria-card border border-slate-700/50 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Icon name="database" className="w-16 h-16" /></div>
                 <div className="bg-cyan-500/10 p-3 rounded-md text-cyan-400 border border-cyan-500/20">
                  <Icon name="database" className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total Mass</p>
                  <p className="text-2xl font-mono font-bold text-white">{formatBytes(totalMass)}</p>
                </div>
              </div>
              <div className="bg-memoria-card border border-slate-700/50 rounded-lg p-5 flex items-center gap-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Icon name="shield" className="w-16 h-16" /></div>
                 <div className="bg-fuchsia-500/10 p-3 rounded-md text-fuchsia-400 border border-fuchsia-500/20">
                  <Icon name="shield" className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Core Integrity</p>
                  <p className="text-2xl font-mono font-bold text-white">100%</p>
                </div>
              </div>
            </div>

            {/* Network Graph - Only show if we have data */}
            {networkData.length > 0 && (
                <div className="bg-memoria-card border border-slate-700/50 rounded-lg p-6">
                <NetworkGraph data={networkData} />
                </div>
            )}

            {/* Topology */}
            <div>
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                   <Icon name="cpu" className="w-5 h-5 text-slate-400" />
                   Topology
                   {dirHandleRef.current && <span className="text-[10px] bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded border border-cyan-700/50 uppercase tracking-wide">Local Mounted</span>}
                 </h2>
                 
                 {/* Search & Filter Controls */}
                 <div className="flex items-center gap-3">
                   <div className="relative">
                     <input
                       type="text"
                       placeholder="Search brains..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-48"
                     />
                     <Icon name="cpu" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   </div>
                   <select
                     value={filterZone}
                     onChange={(e) => setFilterZone(e.target.value as SectorZone | 'all')}
                     className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-cyan-500 outline-none"
                   >
                     <option value="all">All Zones</option>
                     <option value={SectorZone.SINGULARITY}>Singularity</option>
                     <option value={SectorZone.EVENT_HORIZON}>Event Horizon</option>
                     <option value={SectorZone.DEEP_VOID}>Deep Void</option>
                   </select>
                 </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {filteredBrains.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-slate-500">
                    {brains.length === 0 ? 'No brains mounted. Click "Mount Source" to get started.' : 'No brains match your search.'}
                  </div>
                ) : (
                  filteredBrains.map(brain => (
                    <div 
                      key={brain.id} 
                      onClick={() => setSelectedBrain(brain)}
                      className="cursor-pointer transform transition-transform hover:scale-[1.02]"
                    >
                      <BrainCard brain={brain} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case NavigationTab.LOGS:
        return (
          <div className="space-y-4">
            {/* Logs Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon name="activity" className="w-5 h-5 text-slate-400" />
                Event Stream
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">{logs.length}</span>
              </h2>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-1 rounded border border-slate-800 hover:border-red-800"
                >
                  Clear Logs
                </button>
              )}
            </div>
            
            {/* Logs Container */}
            <div className="bg-black/90 rounded-lg border border-slate-800 p-4 font-mono text-xs h-[calc(100vh-200px)] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center italic py-8 flex flex-col items-center gap-2">
                  <Icon name="activity" className="w-8 h-8 opacity-30" />
                  <p>No events logged yet</p>
                  <p className="text-slate-700">Activity will appear here as you use the app</p>
                </div>
              ) : (
                [...logs].reverse().map((log, i) => (
                  <div key={i} className="mb-2 flex gap-3 border-b border-slate-900/50 pb-2 last:border-0 hover:bg-slate-900/30 -mx-2 px-2 rounded">
                    <span className="text-slate-600 w-20 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`font-bold w-10 shrink-0 uppercase text-[10px] py-0.5 px-1.5 rounded text-center ${
                      log.level === 'info' ? 'bg-cyan-900/30 text-cyan-400' :
                      log.level === 'warn' ? 'bg-amber-900/30 text-amber-400' :
                      log.level === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-slate-500 font-bold w-12 shrink-0 uppercase text-[10px]">{log.module}</span>
                    <span className="text-slate-300 flex-1">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case NavigationTab.DEVICES:
         return (
            <div className="grid grid-cols-1 gap-4">
               {devices.map(device => (
                  <div key={device.id} className="bg-memoria-card border border-slate-700/50 p-4 rounded-lg flex items-center justify-between group hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                        <div>
                           <p className="text-white font-bold font-mono text-sm">{device.name}</p>
                           <p className="text-slate-500 text-xs font-mono">{device.ip}</p>
                        </div>
                     </div>
                     <div className="text-right flex items-center gap-3">
                        <span className="text-[10px] px-2 py-1 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase font-mono tracking-wider">{device.platform}</span>
                        {device.isSelf && <span className="text-[10px] text-fuchsia-400 font-bold border border-fuchsia-500/20 px-2 py-1 rounded bg-fuchsia-500/10">HOST</span>}
                     </div>
                  </div>
               ))}
            </div>
         );
      default:
        return <div className="text-center text-slate-500 mt-20">System Initialize...</div>;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0B0F19] text-slate-200 font-sans selection:bg-fuchsia-500/30 selection:text-white">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-slate-800/60 bg-[#0B0F19] flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-600 to-fuchsia-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/20">
            A
          </div>
          <span className="font-bold text-lg tracking-tight hidden md:block text-white">Antigravity</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon="activity" 
            label="Command Deck" 
            active={activeTab === NavigationTab.DASHBOARD} 
            onClick={() => setActiveTab(NavigationTab.DASHBOARD)} 
          />
          <SidebarItem 
            icon="server" 
            label="Nodes" 
            active={activeTab === NavigationTab.DEVICES} 
            onClick={() => setActiveTab(NavigationTab.DEVICES)} 
          />
          <SidebarItem 
            icon="terminal" 
            label="System Logs" 
            active={activeTab === NavigationTab.LOGS} 
            onClick={() => setActiveTab(NavigationTab.LOGS)} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
             <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
             <span className="text-[10px] uppercase tracking-widest text-slate-500 hidden md:block">{isConnected ? 'System Online' : 'System Idle'}</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1 hidden md:block font-mono">v2.1.0-REL</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-16 md:ml-64 p-4 md:p-8 overflow-x-hidden relative">
        <header className="flex justify-between items-center mb-8">
           <div>
             <h1 className="text-2xl font-bold text-white tracking-tight">{
               activeTab === NavigationTab.DASHBOARD ? 'Control Deck' :
               activeTab === NavigationTab.LOGS ? 'Event Stream' : 'Node Grid'
             }</h1>
             <p className="text-slate-500 text-xs font-mono mt-1 uppercase tracking-wider">Cognitive Operating System</p>
           </div>
           
           <div className="flex items-center gap-3">
             <button
               onClick={handleMountLocal}
               className="bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-800/50 flex items-center gap-2 transition-all"
               title="Mount Local Context"
             >
               <Icon name="folder" className="w-4 h-4" />
               <span className="hidden sm:inline text-sm font-medium">Mount Source</span>
             </button>
              
              {/* Cloud Sync Button - only show if Supabase configured */}
              {isSupabaseConfigured() && (
                syncCode ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncToCloud}
                      disabled={syncing || brains.length === 0}
                      className="bg-fuchsia-900/30 hover:bg-fuchsia-900/50 disabled:opacity-50 text-fuchsia-400 px-4 py-2 rounded-lg border border-fuchsia-800/50 flex items-center gap-2 transition-all"
                      title="Sync to Cloud"
                    >
                      {syncing ? (
                        <div className="w-4 h-4 border-2 border-fuchsia-400/30 border-t-fuchsia-400 rounded-full animate-spin" />
                      ) : (
                        <Icon name="activity" className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline text-sm font-medium">
                        {syncing ? 'Syncing...' : 'Sync'}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowSyncModal(true)}
                      className="p-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-800/50 transition-all"
                      title={`Connected: ${syncCode}`}
                    >
                      <Icon name="shield" className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSyncModal(true)}
                    className="bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 px-4 py-2 rounded-lg border border-cyan-800/50 flex items-center gap-2 transition-all"
                    title="Set up Cloud Sync"
                  >
                    <Icon name="activity" className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm font-medium">Cloud Sync</span>
                  </button>
                )
              )}
              
             <button 
                onClick={() => setShowHelp(true)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 rounded-lg border border-slate-800 transition-all"
                title="System Guide"
             >
                <Icon name="help" className="w-5 h-5" />
             </button>
             <button 
                onClick={() => setShowSettings(true)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-all"
                title="Configuration"
             >
                <Icon name="settings" className="w-5 h-5" />
             </button>
             <button 
               onClick={initSystem}
               className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-2 transition-all hover:border-slate-700"
             >
               <Icon name="refresh" className="w-4 h-4" />
               <span className="hidden sm:inline text-sm font-medium">Resync</span>
             </button>
           </div>
        </header>

        {loading ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="w-12 h-12 border-2 border-slate-800 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
              <h2 className="text-sm font-mono text-slate-400 animate-pulse">ESTABLISHING UPLINK...</h2>
            </div>
        ) : renderContent()}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
           <div className="bg-[#0f172a] border border-slate-800 rounded-lg w-full max-w-md p-6 shadow-2xl animate-fade-in">
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon name="settings" className="w-5 h-5 text-cyan-500" />
                    Uplink Configuration
                 </h2>
                 <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Core API Endpoint</label>
                    <input 
                      type="text" 
                      value={apiUrlInput}
                      onChange={(e) => setApiUrlInput(e.target.value)}
                      placeholder="e.g. https://api.antigravity.io/v1"
                      className="w-full bg-black border border-slate-800 rounded p-3 text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none font-mono text-xs placeholder:text-slate-700"
                    />
                    <p className="text-[10px] text-slate-600 mt-2">
                       Enter your local bridge or remote server URL. Leave empty to use File System Mount.
                    </p>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                 <button 
                   onClick={() => setShowSettings(false)}
                   className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium"
                 >
                   CANCEL
                 </button>
                 <button 
                   onClick={handleSaveSettings}
                   className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold tracking-wide transition-colors"
                 >
                   INITIALIZE
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
           <div className="bg-[#0f172a] border border-slate-800 rounded-lg w-full max-w-2xl p-0 shadow-2xl animate-fade-in overflow-hidden">
              <div className="bg-slate-900/50 p-6 border-b border-slate-800 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Icon name="help" className="w-5 h-5" />
                    </div>
                    System Guide
                 </h2>
                 <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-8">
                 <section>
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Antigravity Topology</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/40 p-3 rounded border border-slate-800">
                            <span className="text-fuchsia-400 font-mono text-xs font-bold block mb-1">SINGULARITY</span>
                            <p className="text-slate-400 text-xs leading-relaxed">The immutable core identity. Maps to <code>context_state</code> or <code>implicit</code> folders.</p>
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded border border-slate-800">
                            <span className="text-cyan-400 font-mono text-xs font-bold block mb-1">EVENT HORIZON</span>
                            <p className="text-slate-400 text-xs leading-relaxed">Active working memory buffer. Maps to <code>conversations</code> folders.</p>
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded border border-slate-800">
                            <span className="text-slate-300 font-mono text-xs font-bold block mb-1">DEEP VOID</span>
                            <p className="text-slate-400 text-xs leading-relaxed">Massive archival vector store. Maps to <code>brain</code> folder.</p>
                        </div>
                    </div>
                 </section>

                 <section>
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">Operation Modes</h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                        <li className="flex gap-3">
                            <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-xs font-mono h-fit border border-emerald-800/50">LOCAL MOUNT</span>
                            <p className="text-slate-400 text-xs">Recommended. Click "Mount Source" and select your <code>~/.gemini/antigravity</code> folder.</p>
                        </li>
                        <li className="flex gap-3">
                            <span className="bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded text-xs font-mono h-fit border border-cyan-800/50">API UPLINK</span>
                            <p className="text-slate-400 text-xs">Connects to a remote Antigravity Core instance via JSON API.</p>
                        </li>
                    </ul>
                 </section>

                 <section className="bg-slate-800/30 p-4 rounded border border-slate-800">
                     <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Keyboard Shortcuts</h3>
                     <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                         <div className="flex justify-between text-slate-400"><span>Navigate Tabs</span> <span className="text-slate-200">Click Sidebar</span></div>
                         <div className="flex justify-between text-slate-400"><span>Force Resync</span> <span className="text-slate-200">Click Refresh</span></div>
                     </div>
                 </section>
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                 <button 
                   onClick={() => setShowHelp(false)}
                   className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold tracking-wide transition-colors"
                 >
                   CLOSE GUIDE
                 </button>
              </div>
           </div>
        </div>
       )}

      {/* Sync Code Modal */}
      {showSyncModal && (
        <SyncCodeModal 
          onClose={() => setShowSyncModal(false)} 
          onSync={handleSyncCodeChange}
          currentCode={syncCode}
        />
      )}

      {/* Brain Detail Modal */}
      {selectedBrain && (
        <BrainDetail
          brain={selectedBrain}
          dirHandle={dirHandleRef.current}
          syncCode={syncCode}
          onClose={() => setSelectedBrain(null)}
          onSync={syncCode ? handleSyncToCloud : undefined}
        />
      )}
    </div>
  );
}

const SidebarItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
        : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-200'
    }`}
  >
    <Icon name={icon} className={`w-5 h-5 ${active ? 'text-cyan-400' : 'group-hover:text-white'}`} />
    <span className="font-medium text-sm hidden md:block">{label}</span>
  </button>
);

export default App;