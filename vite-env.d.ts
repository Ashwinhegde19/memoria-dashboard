/// <reference types="vite/client" />

// Extend ImportMeta for Vite environment variables
interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// File System Access API type declarations
// These are experimental APIs not yet in TypeScript's lib.dom.d.ts

interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    values(): AsyncIterableIterator<FileSystemHandle>;
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    keys(): AsyncIterableIterator<string>;
}

interface Window {
    showDirectoryPicker?: (options?: {
        id?: string;
        mode?: 'read' | 'readwrite';
        startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | string;
    }) => Promise<FileSystemDirectoryHandle>;
}
