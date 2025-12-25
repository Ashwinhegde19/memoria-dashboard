import { Brain, Device, LogEntry, SyncState, SectorZone } from '../types';

// ============================================================================
// CONFIGURATION: REAL DATA INTEGRATION
// ============================================================================
const LOCAL_STORAGE_KEY = 'ANTIGRAVITY_API_URL';

/**
 * Validates if a string is a valid URL
 */
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getApiConfig = (): string => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored && isValidUrl(stored)) return stored;

  // Vite uses import.meta.env, not process.env
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && isValidUrl(envUrl)) return envUrl;

  return "";
};

export const saveApiConfig = (url: string): void => {
  const trimmed = url?.trim() ?? '';
  if (trimmed.length > 0) {
    if (!isValidUrl(trimmed)) {
      throw new Error('Invalid URL format. Please provide a valid HTTP/HTTPS URL.');
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Validates the API response structure
 */
const validateSystemState = (data: unknown): data is {
  devices: Device[];
  brains: Brain[];
  logs: LogEntry[];
  networkData: { time: string; mbps: number }[];
} => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  return (
    Array.isArray(obj.devices) &&
    Array.isArray(obj.brains) &&
    Array.isArray(obj.logs) &&
    Array.isArray(obj.networkData)
  );
};

export const fetchSystemState = async (): Promise<{
  devices: Device[];
  brains: Brain[];
  logs: LogEntry[];
  networkData: { time: string; mbps: number }[];
}> => {
  const apiUrl = getApiConfig();
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/system-state`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Connection Failed: ${response.status} ${response.statusText}`);
      }

      const data: unknown = await response.json();

      if (!validateSystemState(data)) {
        throw new Error('Invalid API response structure');
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch system state:', error);
      throw error;
    }
  }
  // No API configured
  throw new Error("NO_SOURCE");
};