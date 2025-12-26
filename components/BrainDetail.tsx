import React, { useState, useEffect } from 'react';
import { Brain, SectorZone } from '../types';
import { Icon } from './Icons';
import { formatBytes } from '../services/mockData';
import { listCloudFiles, downloadFileFromCloud, CloudFile } from '../services/supabaseService';

interface BrainDetailProps {
  brain: Brain;
  dirHandle: FileSystemDirectoryHandle | null;
  syncCode: string | null;
  onClose: () => void;
  onSync?: () => void;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
  path: string;
}

export const BrainDetail: React.FC<BrainDetailProps> = ({ brain, dirHandle, syncCode, onClose, onSync }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [source, setSource] = useState<'local' | 'cloud'>('local');

  // Load files when component mounts
  useEffect(() => {
    loadFiles();
  }, [brain, dirHandle, syncCode]);

  const loadFiles = async () => {
    setLoading(true);
    
    // Try local first, then cloud
    if (dirHandle) {
      try {
        const brainDirName = brain.localPath.replace('./', '');
        const brainHandle = await dirHandle.getDirectoryHandle(brainDirName);
        const fileTree = await scanDirectory(brainHandle, brainDirName);
        setFiles(fileTree);
        setSource('local');
        setLoading(false);
        return;
      } catch {
        // Local not available, try cloud
      }
    }
    
    // Try cloud
    if (syncCode) {
      try {
        const cloudFiles = await listCloudFiles(syncCode, brain.name);
        const fileTree = convertCloudFilesToTree(cloudFiles);
        setFiles(fileTree);
        setSource('cloud');
      } catch (err) {
        console.error('Failed to load from cloud:', err);
      }
    }
    
    setLoading(false);
  };

  // Convert flat CloudFile list to tree structure
  const convertCloudFilesToTree = (cloudFiles: CloudFile[]): FileNode[] => {
    const root: FileNode[] = [];
    const pathMap = new Map<string, FileNode>();
    
    // Sort to process folders before their contents
    const sorted = [...cloudFiles].sort((a, b) => a.path.localeCompare(b.path));
    
    for (const cf of sorted) {
      const parts = cf.path.split('/');
      const node: FileNode = {
        name: cf.name,
        type: cf.isFolder ? 'folder' : 'file',
        size: cf.size,
        path: cf.path,
        children: cf.isFolder ? [] : undefined,
      };
      
      pathMap.set(cf.path, node);
      
      if (parts.length === 1) {
        root.push(node);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parent = pathMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          root.push(node);
        }
      }
    }
    
    return root;
  };

  const scanDirectory = async (
    handle: FileSystemDirectoryHandle,
    basePath: string
  ): Promise<FileNode[]> => {
    const nodes: FileNode[] = [];
    const IGNORED = new Set(['.git', 'node_modules', '.DS_Store']);

    for await (const entry of handle.values()) {
      if (IGNORED.has(entry.name)) continue;

      const path = `${basePath}/${entry.name}`;

      if (entry.kind === 'file') {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        nodes.push({
          name: entry.name,
          type: 'file',
          size: file.size,
          path,
        });
      } else {
        const dirHandle = entry as FileSystemDirectoryHandle;
        const children = await scanDirectory(dirHandle, path);
        nodes.push({
          name: entry.name,
          type: 'folder',
          children,
          path,
        });
      }
    }

    // Sort: folders first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const loadFileContent = async (path: string) => {
    setLoadingContent(true);
    setSelectedFile(path);
    
    try {
      if (source === 'local' && dirHandle) {
        // Load from local file system
        const parts = path.split('/').filter(Boolean);
        let currentHandle: FileSystemDirectoryHandle = dirHandle;
        
        for (let i = 0; i < parts.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }
        
        const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1]);
        const file = await fileHandle.getFile();
        
        if (file.size > 100000) {
          setFileContent('[File too large to preview]');
        } else if (isTextFile(file.name)) {
          const text = await file.text();
          setFileContent(text);
        } else {
          setFileContent('[Binary file - cannot preview]');
        }
      } else if (source === 'cloud' && syncCode) {
        // Load from cloud storage
        const blob = await downloadFileFromCloud(syncCode, brain.name, path);
        
        if (blob.size > 100000) {
          setFileContent('[File too large to preview]');
        } else if (isTextFile(path)) {
          const text = await blob.text();
          setFileContent(text);
        } else {
          setFileContent('[Binary file - cannot preview]');
        }
      }
    } catch (err) {
      setFileContent(`[Error loading file: ${err}]`);
    } finally {
      setLoadingContent(false);
    }
  };

  const isTextFile = (name: string): boolean => {
    const textExtensions = ['.json', '.md', '.txt', '.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.yml', '.yaml', '.xml', '.svg', '.sh', '.py', '.rb', '.go', '.rs', '.sql'];
    return textExtensions.some(ext => name.toLowerCase().endsWith(ext));
  };

  const getZoneColor = (zone: SectorZone) => {
    switch (zone) {
      case SectorZone.SINGULARITY: return 'text-fuchsia-400 bg-fuchsia-900/30 border-fuchsia-700/50';
      case SectorZone.EVENT_HORIZON: return 'text-cyan-400 bg-cyan-900/30 border-cyan-700/50';
      case SectorZone.DEEP_VOID: return 'text-slate-300 bg-slate-800/50 border-slate-700/50';
    }
  };

  const renderFileTree = (nodes: FileNode[], depth = 0): JSX.Element[] => {
    return nodes.map(node => (
      <div key={node.path}>
        <div
          onClick={() => node.type === 'folder' ? toggleFolder(node.path) : loadFileContent(node.path)}
          className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ${
            selectedFile === node.path 
              ? 'bg-cyan-900/30 text-cyan-300' 
              : 'hover:bg-slate-800/50 text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.type === 'folder' ? (
            <>
              <Icon 
                name={expandedFolders.has(node.path) ? 'folder' : 'folder'} 
                className="w-4 h-4 text-amber-500" 
              />
              <span className="flex-1 truncate">{node.name}</span>
              <span className="text-[10px] text-slate-600">{node.children?.length || 0}</span>
            </>
          ) : (
            <>
              <Icon name="file" className="w-4 h-4 text-slate-500" />
              <span className="flex-1 truncate">{node.name}</span>
              <span className="text-[10px] text-slate-600">{formatBytes(node.size || 0)}</span>
            </>
          )}
        </div>
        {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
          <div>{renderFileTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex">
      {/* Left Panel - File Tree */}
      <div className="w-80 bg-[#0a0e17] border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-lg font-bold text-white truncate">{brain.name}</h2>
              <p className="text-xs text-slate-500 font-mono">{brain.localPath}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded border ${getZoneColor(brain.zone)}`}>
              {brain.zone}
            </span>
            <span className={`px-2 py-0.5 rounded border ${source === 'cloud' ? 'bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-700/50' : 'bg-emerald-900/30 text-emerald-400 border-emerald-700/50'}`}>
              {source === 'cloud' ? '☁️ Cloud' : '💻 Local'}
            </span>
          </div>
          
          {/* Copy Resume Command */}
          <button
            onClick={() => {
              const uuid = brain.localPath.replace('./', '');
              const command = `gemini --resume ${uuid}`;
              navigator.clipboard.writeText(command);
              alert('Copied: ' + command);
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition-colors"
            title="Copy resume command for Gemini CLI"
          >
            <span>📋</span> Copy Resume Command
          </button>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2 text-sm font-mono">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2"></div>
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <Icon name="folder" className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No files found</p>
              {!syncCode && <p className="text-xs mt-2">Set up cloud sync to view files from other devices</p>}
            </div>
          ) : (
            renderFileTree(files)
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {onSync && source === 'local' && (
            <button
              onClick={onSync}
              className="w-full py-2 bg-fuchsia-900/30 hover:bg-fuchsia-900/50 text-fuchsia-400 rounded border border-fuchsia-800/50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="activity" className="w-4 h-4" />
              Sync to Cloud
            </button>
          )}
          <button
            onClick={loadFiles}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm font-medium transition-colors"
          >
            Refresh Files
          </button>
        </div>
      </div>

      {/* Right Panel - File Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            {selectedFile ? (
              <p className="text-sm font-mono text-slate-400">{selectedFile}</p>
            ) : (
              <p className="text-sm text-slate-600 italic">Select a file to preview</p>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {loadingContent ? (
            <div className="text-center py-8 text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2"></div>
              Loading file...
            </div>
          ) : fileContent ? (
            <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
              {fileContent}
            </pre>
          ) : (
            <div className="text-center py-16 text-slate-600">
              <Icon name="file" className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Select a file from the tree to view its contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
