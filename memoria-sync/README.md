# memoria-sync CLI

> Cross-device sync for Gemini CLI conversations

## 🚀 One Command Install

```bash
curl -sSL https://raw.githubusercontent.com/Ashwinhegde19/memoria-dashboard/main/memoria-sync/install.sh | bash
```

## Usage

```bash
# List your synced brains
memoria-sync --code YOUR_SYNC_CODE --list

# Sync a brain and auto-resume conversation
memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID

# Sync without auto-resuming
memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID --no-resume
```

## How to Get Your Sync Code

1. Go to https://memoria-dashboard.vercel.app
2. Mount your `~/.gemini/antigravity/` folder
3. Click **Cloud Sync** → Create sync code
4. Sync your brains to cloud
5. Click **📋** button → Copies the install command with your code!

## What It Does

1. 📥 Downloads brain files from cloud
2. 📁 Saves to `~/.gemini/antigravity/brain/{uuid}/`
3. 💬 Downloads conversation `.pb` file
4. 📂 Saves to `~/.gemini/antigravity/conversations/`
5. 🚀 Runs `gemini --resume {uuid}` automatically

## Requirements

- Node.js 18+
- Git
- Gemini CLI installed
