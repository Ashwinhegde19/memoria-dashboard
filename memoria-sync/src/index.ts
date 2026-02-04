#!/usr/bin/env node

import { Command } from 'commander';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

// Supabase config - same as memoria-dashboard
const SUPABASE_URL = 'https://jbltrikxsmqqdyofnfhj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3gwpbWD7Xv7OLtuk3i8AKQ_gfevVf2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_BUCKET = 'brain-files';

interface CloudFile {
    name: string;
    path: string;
    size: number;
    isFolder: boolean;
}

// List all files for a brain in cloud storage (recursive)
async function listCloudFiles(
    syncCode: string,
    brainName: string,
    subPath: string = ''
): Promise<CloudFile[]> {
    const storagePath = subPath
        ? `${syncCode}/${brainName}/${subPath}`
        : `${syncCode}/${brainName}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(storagePath, { limit: 1000 });

    if (error) throw error;

    const files: CloudFile[] = [];

    for (const item of data || []) {
        const itemPath = subPath ? `${subPath}/${item.name}` : item.name;

        if (item.id === null) {
            // It's a folder - recursively list
            files.push({
                name: item.name,
                path: itemPath,
                size: 0,
                isFolder: true,
            });
            const subFiles = await listCloudFiles(syncCode, brainName, itemPath);
            files.push(...subFiles);
        } else {
            // It's a file
            files.push({
                name: item.name,
                path: itemPath,
                size: item.metadata?.size || 0,
                isFolder: false,
            });
        }
    }

    return files;
}

// Download a file from Supabase Storage
async function downloadFileFromCloud(
    syncCode: string,
    brainName: string,
    filePath: string
): Promise<Buffer> {
    const storagePath = `${syncCode}/${brainName}/${filePath}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);

    if (error) throw error;
    if (!data) throw new Error('No data received');

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// Get brains for a sync code
async function getBrainsFromCloud(syncCode: string): Promise<{ name: string; local_path: string }[]> {
    const { data, error } = await supabase
        .from('brains')
        .select('name, local_path')
        .eq('sync_code', syncCode);

    if (error) throw error;
    return data || [];
}

// Main sync function
async function syncBrain(syncCode: string, uuid: string, noResume: boolean) {
    const antigravityPath = path.join(os.homedir(), '.gemini', 'antigravity');
    const brainPath = path.join(antigravityPath, 'brain', uuid);
    const conversationsPath = path.join(antigravityPath, 'conversations');

    console.log('🔗 Connecting to Memoria cloud...');

    // Get brains to find the one matching this UUID
    const brains = await getBrainsFromCloud(syncCode);
    const brain = brains.find(b => b.local_path?.includes(uuid));

    if (!brain) {
        console.error(`❌ Brain with UUID ${uuid} not found for sync code ${syncCode}`);
        console.log('Available brains:');
        brains.forEach(b => console.log(`  - ${b.name} (${b.local_path})`));
        process.exit(1);
    }

    console.log(`📥 Downloading ${brain.name}...`);

    // Create directories
    fs.mkdirSync(brainPath, { recursive: true });
    fs.mkdirSync(conversationsPath, { recursive: true });

    // List and download brain files
    const files = await listCloudFiles(syncCode, brain.name);
    const actualFiles = files.filter(f => !f.isFolder);

    console.log(`   Found ${actualFiles.length} files`);

    for (let i = 0; i < actualFiles.length; i++) {
        const file = actualFiles[i];
        process.stdout.write(`\r   [${i + 1}/${actualFiles.length}] ${file.name.slice(0, 30)}...`);

        try {
            const content = await downloadFileFromCloud(syncCode, brain.name, file.path);
            const filePath = path.join(brainPath, file.path);

            // Create parent directory if needed
            const fileDir = path.dirname(filePath);
            fs.mkdirSync(fileDir, { recursive: true });

            fs.writeFileSync(filePath, content);
        } catch (err) {
            console.error(`\n   ⚠️ Failed to download ${file.name}`);
        }
    }

    console.log(`\n📁 Saved to ${brainPath}`);

    // Try to download conversation file
    try {
        const conversationFiles = await listCloudFiles(syncCode, `${brain.name}/_conversation`);
        const pbFile = conversationFiles.find(f => f.name.endsWith('.pb'));

        if (pbFile) {
            console.log('💬 Downloading conversation history...');
            const content = await downloadFileFromCloud(syncCode, `${brain.name}/_conversation`, pbFile.path);
            const pbPath = path.join(conversationsPath, `${uuid}.pb`);
            fs.writeFileSync(pbPath, content);
            console.log(`   Saved to ${pbPath}`);
        }
    } catch {
        console.log('ℹ️  No conversation file found');
    }

    if (!noResume) {
        console.log('🚀 Launching Gemini CLI...');
        console.log('');

        // Run gemini --resume
        const gemini = spawn('gemini', ['--resume', uuid], {
            stdio: 'inherit',
            shell: true,
        });

        gemini.on('error', (err) => {
            console.error('Failed to launch Gemini CLI:', err.message);
            console.log(`Run manually: gemini --resume ${uuid}`);
        });
    } else {
        console.log('');
        console.log('✅ Sync complete!');
        console.log(`   To resume: gemini --resume ${uuid}`);
    }
}

// List brains for a sync code
async function listBrains(syncCode: string) {
    console.log('🔗 Connecting to Memoria cloud...');

    const brains = await getBrainsFromCloud(syncCode);

    if (brains.length === 0) {
        console.log('No brains found for this sync code.');
        return;
    }

    console.log(`\n📁 Found ${brains.length} brains:\n`);
    brains.forEach((b, i) => {
        const uuid = b.local_path?.replace('./', '') || 'unknown';
        console.log(`  ${i + 1}. ${b.name}`);
        console.log(`     UUID: ${uuid}`);
        console.log('');
    });

    console.log('To sync a brain, run:');
    console.log('  memoria-sync --code YOUR_CODE --uuid UUID_FROM_ABOVE');
}

// CLI setup
const program = new Command();

program
    .name('memoria-sync')
    .description('Cross-device sync CLI for memoria-dashboard')
    .version('1.0.0');

program
    .option('-c, --code <syncCode>', 'Sync code from memoria-dashboard')
    .option('-u, --uuid <uuid>', 'Brain UUID to sync')
    .option('-l, --list', 'List available brains for a sync code')
    .option('--no-resume', 'Don\'t auto-resume after syncing');

program.parse();

const options = program.opts();

async function main() {
    if (!options.code) {
        console.error('❌ Sync code is required. Use --code YOUR_SYNC_CODE');
        process.exit(1);
    }

    try {
        if (options.list) {
            await listBrains(options.code);
        } else if (options.uuid) {
            await syncBrain(options.code, options.uuid, !options.resume);
        } else {
            console.error('❌ Either --uuid or --list is required');
            console.log('');
            console.log('Usage:');
            console.log('  memoria-sync --code CODE --list');
            console.log('  memoria-sync --code CODE --uuid UUID');
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
        process.exit(1);
    }
}

main();
