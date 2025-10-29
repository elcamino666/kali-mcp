#!/bin/bash

echo "🐉 Kali Linux Docker MCP Server Setup"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Docker found: $(docker --version)"
echo "✅ Node.js found: $(node --version)"
echo ""

# Create shared directory
mkdir -p shared
echo "✅ Created shared directory"

# Build and start container
echo ""
echo "🔨 Building Kali Linux Docker container..."
docker-compose build

echo ""
echo "🚀 Starting container..."
docker-compose up -d

echo ""
echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add the MCP server to your Claude Desktop config:"
echo ""
echo "   macOS/Linux: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo ""
echo "2. Add this configuration:"
echo ""
echo '   {'
echo '     "mcpServers": {'
echo '       "kali-docker": {'
echo '         "command": "node",'
echo "         \"args\": [\"$(pwd)/index.js\"]"
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "3. Restart Claude Desktop"
echo ""
echo "Container status:"
docker ps | grep kali
