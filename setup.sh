#!/bin/bash

echo "🐉 Kali Linux VM MCP Server Setup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if UTM is installed
if [ -d "/Applications/UTM.app" ]; then
    echo "✅ UTM is installed"
else
    echo "⚠️  UTM not found. Install it with: brew install --cask utm"
    echo "   Or download from: https://mac.getutm.app/"
fi

echo ""
echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "🔍 Checking VM connection..."
if [ -f "vm-config.json" ]; then
    VM_HOST=$(node -p "JSON.parse(require('fs').readFileSync('vm-config.json', 'utf8')).host")
    VM_USER=$(node -p "JSON.parse(require('fs').readFileSync('vm-config.json', 'utf8')).username")
    KEY_PATH=$(node -p "JSON.parse(require('fs').readFileSync('vm-config.json', 'utf8')).privateKeyPath")

    if [ -f "$KEY_PATH" ]; then
        echo "✅ SSH key found at $KEY_PATH"

        # Test SSH connection
        if ssh -i "$KEY_PATH" -o ConnectTimeout=3 -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" 'echo "Connection successful"' &> /dev/null; then
            echo "✅ Successfully connected to Kali VM at $VM_HOST"
        else
            echo "⚠️  Cannot connect to Kali VM at $VM_HOST"
            echo "   Make sure the VM is running in UTM"
        fi
    else
        echo "⚠️  SSH key not found at $KEY_PATH"
        echo "   Run: ssh-keygen -t ed25519 -f ~/.ssh/kali_mcp -N \"\""
        echo "   Then: ssh-copy-id -i ~/.ssh/kali_mcp.pub kali@$VM_HOST"
    fi
else
    echo "⚠️  vm-config.json not found"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Ensure Kali VM is running in UTM"
echo "2. Add the MCP server to your Claude Desktop config:"
echo ""
echo "   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "3. Add this configuration:"
echo ""
echo '   {'
echo '     "mcpServers": {'
echo '       "kali-vm": {'
echo '         "command": "node",'
echo "         \"args\": [\"$(pwd)/index.js\"]"
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "4. Restart Claude Desktop"
echo ""
