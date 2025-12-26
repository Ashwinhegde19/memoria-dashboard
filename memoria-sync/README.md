# memoria-sync CLI

> Cross-device sync for Gemini CLI conversations

## 🚀 One-Line Install (Linux/macOS)

```bash
curl -sSL https://raw.githubusercontent.com/Ashwinhegde19/memoria-dashboard/main/memoria-sync/install.sh | bash
```

Then run:
```bash
export PATH="$HOME/.memoria-sync:$PATH"  # Only needed once
memoria-sync --code YOUR_SYNC_CODE --list
```

## Usage

```bash
# List available brains for a sync code
memoria-sync --code PBA-8496-RZSQ --list

# Sync a brain and auto-resume conversation
memoria-sync --code PBA-8496-RZSQ --uuid c98a759d-8ea9-45b0-b61b-9e1a8f9f14fa

# Sync without auto-resuming
memoria-sync --code PBA-8496-RZSQ --uuid c98a759d-... --no-resume
```

## What it does

1. 📥 Downloads all brain files from Supabase cloud
2. 📁 Places them in `~/.gemini/antigravity/brain/{uuid}/`
3. 💬 Downloads conversation `.pb` file
4. 📂 Places it in `~/.gemini/antigravity/conversations/`
5. 🚀 Runs `gemini --resume {uuid}` automatically

## Example Output

```
📥 Downloading memoria-dashboard (18 files)...
📁 Saved to ~/.gemini/antigravity/brain/c98a759d-.../
💬 Conversation synced!
🚀 Launching Gemini CLI...

> Ready to continue your conversation!
```

## Requirements

- Node.js 18+
- Git
- Gemini CLI installed on the target system
