# Memoria Dashboard

> Cross-device sync for Gemini CLI conversations

**Live**: https://memoria-dashboard.vercel.app

## 🚀 Quick Start

### On System A (your computer):
1. Go to https://memoria-dashboard.vercel.app
2. Mount your `~/.gemini/antigravity/` folder
3. Click a brain → **"Sync to Cloud"**
4. Click **📋** button in header to copy sync command

### On System B (other computer):
1. **Paste the command** in terminal
2. Done! Your brains are listed
3. Run: `memoria-sync --code YOUR_CODE --uuid BRAIN_UUID`
4. Conversation continues automatically!

---

## Features

| Feature | Description |
|---------|-------------|
| **Cloud Sync** | Password-protected sync via Supabase |
| **Per-Brain Sync** | Sync individual projects |
| **Progress Bar** | Visual upload progress |
| **Copy Sync Command** | One command for cross-device sync |
| **Auto Resume** | Runs `gemini --resume` automatically |

## Tech Stack

- React 18 + TypeScript + Vite
- Supabase (Storage + Database)
- Tailwind CSS

## memoria-sync CLI

For cross-device sync, see [memoria-sync/README.md](memoria-sync/README.md)

```bash
# Quick install on other system:
curl -sSL https://raw.githubusercontent.com/Ashwinhegde19/memoria-dashboard/main/memoria-sync/install.sh | bash
```

## License

MIT
