import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase config from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client (will be null if not configured)
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

export const isSupabaseConfigured = (): boolean => {
    return supabase !== null;
};

// ============================================================================
// SYNC CODE BASED STORAGE (No Auth Required)
// ============================================================================

export interface CloudBrain {
    id: string;
    sync_code: string;
    name: string;
    zone: string;
    local_path: string;
    mass_bytes: number;
    neuron_count: number;
    created_at: string;
    updated_at: string;
}

/**
 * Save a brain to the cloud using sync code
 */
export const saveBrainToCloud = async (
    syncCode: string,
    brain: {
        name: string;
        zone: string;
        localPath: string;
        massBytes: number;
        neuronCount: number;
    }
): Promise<CloudBrain> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('brains')
        .upsert({
            sync_code: syncCode,
            name: brain.name,
            zone: brain.zone,
            local_path: brain.localPath,
            mass_bytes: brain.massBytes,
            neuron_count: brain.neuronCount,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'sync_code,name'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Get all brains for a sync code
 */
export const getBrainsFromCloud = async (syncCode: string): Promise<CloudBrain[]> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('brains')
        .select('*')
        .eq('sync_code', syncCode)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

/**
 * Delete a brain from cloud
 */
export const deleteBrainFromCloud = async (brainId: string): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
        .from('brains')
        .delete()
        .eq('id', brainId);

    if (error) throw error;
};

/**
 * Check if a sync code exists (has any data)
 */
export const checkSyncCodeExists = async (syncCode: string): Promise<boolean> => {
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('brains')
        .select('id')
        .eq('sync_code', syncCode)
        .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
};

// ============================================================================
// FILE STORAGE (Actual file sync)
// ============================================================================

const STORAGE_BUCKET = 'brain-files';

export interface FileUploadResult {
    path: string;
    success: boolean;
    error?: string;
}

export interface SyncProgress {
    total: number;
    completed: number;
    currentFile: string;
}

/**
 * Upload a single file to Supabase Storage
 */
export const uploadFileToCloud = async (
    syncCode: string,
    brainName: string,
    filePath: string,
    fileContent: Blob
): Promise<FileUploadResult> => {
    if (!supabase) throw new Error('Supabase not configured');

    // Storage path: syncCode/brainName/filePath
    const storagePath = `${syncCode}/${brainName}/${filePath}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileContent, {
            upsert: true,
            contentType: 'application/octet-stream',
        });

    if (error) {
        return { path: filePath, success: false, error: error.message };
    }

    return { path: data.path, success: true };
};

/**
 * Upload multiple files with progress tracking
 */
export const uploadFilesToCloud = async (
    syncCode: string,
    brainName: string,
    files: Array<{ path: string; content: Blob }>,
    onProgress?: (progress: SyncProgress) => void
): Promise<{ uploaded: number; failed: number; errors: string[] }> => {
    const result = { uploaded: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (onProgress) {
            onProgress({
                total: files.length,
                completed: i,
                currentFile: file.path
            });
        }

        try {
            const uploadResult = await uploadFileToCloud(syncCode, brainName, file.path, file.content);
            if (uploadResult.success) {
                result.uploaded++;
            } else {
                result.failed++;
                result.errors.push(`${file.path}: ${uploadResult.error}`);
            }
        } catch (err) {
            result.failed++;
            result.errors.push(`${file.path}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }

    return result;
};

/**
 * Download a file from Supabase Storage
 */
export const downloadFileFromCloud = async (
    syncCode: string,
    brainName: string,
    filePath: string
): Promise<Blob> => {
    if (!supabase) throw new Error('Supabase not configured');

    const storagePath = `${syncCode}/${brainName}/${filePath}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);

    if (error) throw error;
    return data;
};

/**
 * List all files for a brain in cloud storage
 */
export const listCloudFiles = async (
    syncCode: string,
    brainName: string
): Promise<string[]> => {
    if (!supabase) throw new Error('Supabase not configured');

    const storagePath = `${syncCode}/${brainName}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(storagePath, {
            limit: 1000,
        });

    if (error) throw error;
    return data?.map(f => f.name) || [];
};

/**
 * Delete all files for a brain from cloud storage
 */
export const deleteCloudFiles = async (
    syncCode: string,
    brainName: string
): Promise<void> => {
    if (!supabase) throw new Error('Supabase not configured');

    const files = await listCloudFiles(syncCode, brainName);
    if (files.length === 0) return;

    const paths = files.map(f => `${syncCode}/${brainName}/${f}`);

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(paths);

    if (error) throw error;
};
