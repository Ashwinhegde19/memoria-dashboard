# Memoria Dashboard

A futuristic, sci-fi themed dashboard for managing and syncing Gemini CLI "Brains" across devices using Supabase as the cloud backend.

## ✨ Features

### Core
- **Local Directory Mounting** – Mount `~/.gemini/antigravity/` using the File System Access API
- **Auto-detection** – Automatically navigates into `brain/` subfolder when antigravity folder is mounted
- **Project Name Mapping** – Shows project names from `project_names.json` instead of UUIDs

### Cloud Sync
- **Password-Protected Sync Codes** – Secure sync with SHA-256 hashed passwords
- **Per-Brain Sync** – Sync individual projects instead of the entire 800MB+ folder
- **Full Project Sync** – Syncs brain folder + conversation history (.pb file)
- **Progress Bar** – Visual progress tracking during uploads
- **Cross-Device Continuity** – Copy resume command button for easy continuation on other devices

### Brain Management
- **Brain Cards** – View brains with zone classification and sync states
- **File Explorer** – Browse and preview files within each brain
- **Search & Filter** – Filter brains by name or zone
- **Activity Logs** – Monitor sync operations and events

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Bun |
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS (via CDN) |
| **Backend** | Supabase (Database + Storage) |
| **Charts** | Recharts |

## 📁 Project Structure

```
memoria-dashboard/
├── App.tsx                 # Main application component
├── index.html              # Entry HTML with Tailwind config
├── index.tsx               # React entry point
├── types.ts                # TypeScript types
├── components/
│   ├── BrainCard.tsx       # Brain display card
│   ├── BrainDetail.tsx     # File explorer & preview
│   ├── Icons.tsx           # SVG icons
│   └── SyncCodeModal.tsx   # Sync code management
└── services/
    ├── mockData.ts         # Utilities
    └── supabaseService.ts  # Supabase CRUD + file sync
```

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.0+)
- Supabase account

### Installation

```bash
git clone https://github.com/Ashwinhegde19/memoria-dashboard.git
cd memoria-dashboard
bun install
bun run dev
```

### Environment Variables

Create `.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Supabase Setup

1. Create tables:

```sql
-- Brains table
CREATE TABLE brains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_code TEXT NOT NULL,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  local_path TEXT,
  mass_bytes BIGINT DEFAULT 0,
  neuron_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sync_code, name)
);

-- Sync credentials table
CREATE TABLE sync_credentials (
  sync_code TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

2. Create storage bucket `brain-files` with RLS policy:

```sql
CREATE POLICY "Allow anon access to brain-files" 
ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id = 'brain-files')
WITH CHECK (bucket_id = 'brain-files');
```

## 🔄 Cross-Device Workflow

1. **System A**: Mount folder → Click brain → "Sync to Cloud"
2. **System B**: 
   - Download files from Memoria Dashboard
   - Copy to `~/.gemini/antigravity/brain/` and `conversations/`
   - Use "Copy Resume Command" → Paste in terminal: `gemini --resume UUID`

## 📄 License

MIT
