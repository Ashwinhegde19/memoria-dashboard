#!/bin/bash

# memoria-sync installer
# Usage: curl -sSL https://raw.githubusercontent.com/Ashwinhegde19/memoria-dashboard/main/memoria-sync/install.sh | bash

set -e

echo "📦 Installing memoria-sync..."

# Create install directory
INSTALL_DIR="$HOME/.memoria-sync"
mkdir -p "$INSTALL_DIR"

# Clone only the memoria-sync folder
cd "$INSTALL_DIR"
if [ -d "memoria-dashboard" ]; then
  echo "   Updating existing installation..."
  cd memoria-dashboard && git pull
else
  echo "   Downloading..."
  git clone --depth 1 https://github.com/Ashwinhegde19/memoria-dashboard.git
fi

# Install and build
cd "$INSTALL_DIR/memoria-dashboard/memoria-sync"
echo "   Installing dependencies..."
npm install --silent
echo "   Building..."
npm run build --silent

# Create wrapper script
cat > "$INSTALL_DIR/memoria-sync" << 'EOF'
#!/bin/bash
node "$HOME/.memoria-sync/memoria-dashboard/memoria-sync/dist/index.js" "$@"
EOF
chmod +x "$INSTALL_DIR/memoria-sync"

# Add to PATH if not already
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  SHELL_RC=""
  if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -f "$HOME/.bashrc" ]; then
    SHELL_RC="$HOME/.bashrc"
  fi
  
  if [ -n "$SHELL_RC" ]; then
    echo "" >> "$SHELL_RC"
    echo "# memoria-sync" >> "$SHELL_RC"
    echo 'export PATH="$HOME/.memoria-sync:$PATH"' >> "$SHELL_RC"
    echo ""
    echo "✅ memoria-sync installed!"
    echo ""
    echo "Run this to use immediately:"
    echo "  export PATH=\"\$HOME/.memoria-sync:\$PATH\""
    echo ""
  fi
fi

echo "✅ Installation complete!"
echo ""
echo "Usage:"
echo "  memoria-sync --code YOUR_SYNC_CODE --list"
echo "  memoria-sync --code YOUR_SYNC_CODE --uuid BRAIN_UUID"
echo ""
