# Memoria Dashboard

A futuristic, sci-fi themed dashboard for managing and syncing "Brains" (local project directories) across devices using Supabase as the cloud backend.

## ✨ Features

- **Local Directory Mounting** – Mount local folders using the File System Access API
- **Cloud Sync** – Sync brains to Supabase Storage using shareable sync codes
- **Brain Management** – View and manage brains with zone classification (Singularity, Event Horizon, Deep Void)
- **Real-time State Tracking** – Monitor sync states (Coherent, Entangling, Stabilizing, Locked, Decoherent)
- **Cross-Device Sync** – Share sync codes to access your brains from any device
- **Activity Logs** – View sync operations and system events

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS (via CDN) |
| **Backend** | Supabase (Database + Storage) |
| **Charts** | Recharts |
| **Fonts** | Inter, JetBrains Mono |

## 📁 Project Structure

```
memoria-dashboard/
├── App.tsx                 # Main application component
├── index.html              # Entry HTML with Tailwind config
├── index.tsx               # React entry point
├── index.css               # Global styles
├── types.ts                # TypeScript type definitions
├── vite.config.ts          # Vite configuration
├── components/
│   ├── BrainCard.tsx       # Brain display card component
│   ├── ErrorBoundary.tsx   # Error boundary wrapper
│   ├── Icons.tsx           # SVG icon components
│   ├── IntelligencePanel.tsx
│   ├── NetworkGraph.tsx    # Network visualization
│   └── SyncCodeModal.tsx   # Sync code management modal
└── services/
    ├── geminiService.ts    # Gemini AI integration
    ├── mockData.ts         # Mock data and utilities
    └── supabaseService.ts  # Supabase CRUD operations
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (optional, for cloud sync)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd memoria-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file for Supabase integration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🗄️ Supabase Setup

1. Create a new Supabase project
2. Create a `brains` table with the following schema:

```sql
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
```

3. Create a storage bucket named `brain-files` for file sync
4. Set up appropriate RLS policies for your use case

## 📄 License

MIT
