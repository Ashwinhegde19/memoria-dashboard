# memoria-sync CLI

> Cross-device sync for memoria-dashboard

## Installation

```bash
npm install -g memoria-sync
```

## Usage

```bash
# Sync a specific brain and resume conversation
memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID

# Just sync files without resuming
memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID --no-resume

# List available brains for a sync code
memoria-sync --code YOUR_SYNC_CODE --list
```

## What it does

1. 📥 Downloads all brain files from Supabase cloud
2. 📁 Places them in `~/.gemini/antigravity/brain/{uuid}/`
3. 💬 Downloads conversation `.pb` file
4. 📂 Places it in `~/.gemini/antigravity/conversations/`
5. 🚀 Runs `gemini --resume {uuid}` automatically

## Example

```bash
# After installing
memoria-sync --code PBA-8496-RZSQ --uuid c98a759d-8ea9-45b0-b61b-9e1a8f9f14fa

# Output:
# 📥 Downloading memoria-dashboard (18 files)...
# 📁 Saved to ~/.gemini/antigravity/brain/c98a759d-.../
# 💬 Conversation synced!
# 🚀 Launching Gemini CLI...
```

## Requirements

- Node.js 18+
- Gemini CLI installed on the target system
