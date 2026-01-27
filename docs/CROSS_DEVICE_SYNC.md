# Cross-Device Sync Guide

This guide explains how to continue your Gemini CLI conversations on a different computer.

## Overview

```
┌─────────────────┐     Cloud      ┌─────────────────┐
│    System A     │ ──────────────▶│    System B     │
│  (Your laptop)  │   Supabase     │ (Other device)  │
│                 │                │                 │
│  Sync to cloud  │                │  Download &     │
│  via Dashboard  │                │  Resume via CLI │
└─────────────────┘                └─────────────────┘
```

## Step 1: Set Up Cloud Sync (System A)

1. Go to **https://memoria-dashboard.vercel.app**
2. Click **"Mount Source"** → Select your `~/.gemini/antigravity/` folder
3. Click **"Cloud Sync"** button in the header
4. Create a new sync code with a password
5. Click on a brain → Click **"Sync to Cloud"**

## Step 2: Copy the Sync Command

After syncing, click the **📋 button** in the header.

This copies a command like:
```bash
curl -sSL https://raw.githubusercontent.com/Ashwinhegde19/memoria-dashboard/main/memoria-sync/install.sh | bash && export PATH="$HOME/.memoria-sync:$PATH" && memoria-sync --code PBA-8496-RZSQ --list
```

## Step 3: Sync on System B

Open a terminal on your other computer and **paste** the command.

It will:
1. Install the memoria-sync CLI
2. Add it to your PATH
3. List your synced brains

Output:
```
📁 Found 16 brains:
  1. memoria-dashboard (UUID: c98a759d-8ea9-45b0-b61b-9e1a8f9f14fa)
  2. gemini-cli (UUID: 50af7da7-...)
  ...
```

## Step 4: Resume Your Conversation

Run:
```bash
memoria-sync --code PBA-8496-RZSQ --uuid c98a759d-8ea9-45b0-b61b-9e1a8f9f14fa
```

This will:
1. 📥 Download all brain files (task.md, walkthrough.md, etc.)
2. 📁 Save to `~/.gemini/antigravity/brain/{uuid}/`
3. 💬 Download conversation history (.pb file)
4. 📂 Save to `~/.gemini/antigravity/conversations/`
5. 🚀 Run `gemini --resume {uuid}` automatically

**Your conversation continues exactly where you left off!**

## CLI Reference

### List brains
```bash
memoria-sync --code YOUR_SYNC_CODE --list
```

### Sync and resume
```bash
memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID
```

### Sync without resuming
```bash
memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID --no-resume
```

## Requirements

### System A (Dashboard)
- Modern browser (Chrome, Firefox, Safari)
- Access to `~/.gemini/antigravity/` folder

### System B (CLI)
- Node.js 18+
- Git
- Gemini CLI installed

## Troubleshooting

### "Command not found: memoria-sync"
Run:
```bash
export PATH="$HOME/.memoria-sync:$PATH"
```

### "Invalid session identifier"
Make sure you synced the brain to cloud first on System A.

### Files not downloading
Check your sync code is correct and matches what you used on System A.
