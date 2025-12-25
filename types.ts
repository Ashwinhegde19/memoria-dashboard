export enum SyncState {
  COHERENT = 'COHERENT',      // Fully synced
  ENTANGLING = 'ENTANGLING',  // Syncing
  DECOHERENT = 'DECOHERENT',  // Error/Offline
  LOCKED = 'LOCKED',          // Write lock active
  STABILIZING = 'STABILIZING' // Post-sync verification
}

export enum SectorZone {
  SINGULARITY = 'SINGULARITY', // Core Identity
  EVENT_HORIZON = 'EVENT_HORIZON', // Active Working Memory
  DEEP_VOID = 'DEEP_VOID'      // Archival Vector Store
}

export interface Brain {
  id: string;
  name: string;
  zone: SectorZone;
  localPath: string;
  massBytes: number; // Renamed from sizeBytes
  neuronCount: number; // Renamed from fileCount
  lastPulse: number; // Renamed from lastSync
  state: SyncState;
  generation: number;
  peers: string[]; 
  activeLock?: string;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  isSelf: boolean;
  platform: 'macos' | 'linux' | 'windows';
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: 'core' | 'net' | 'fs' | 'lock';
  message: string;
}

export enum NavigationTab {
  DASHBOARD = 'DASHBOARD',
  DEVICES = 'DEVICES',
  LOGS = 'LOGS'
}