# Kali Linux MCP Server

A Model Context Protocol (MCP) server that provides Claude Desktop with access to Kali Linux security tools running in a UTM virtual machine.

## Features

- ✅ Execute security tools in Kali Linux VM from Claude Desktop
- ✅ Direct local network access for network scanning
- ✅ USB WiFi adapter support for wireless security testing
- ✅ SSH-based command execution (passwordless)
- ✅ Install additional tools on the fly

## Prerequisites

- macOS (Apple Silicon or Intel)
- [UTM](https://mac.getutm.app/) virtualization software
- Node.js 18+
- [Claude Desktop](https://claude.ai/download)

## Quick Start

### 1. Install UTM and Download Kali Linux

```bash
# Install UTM
brew install --cask utm

# Download Kali Linux VM for your architecture:
# - Apple Silicon: kali-linux-YYYY.X-arm64-utm.zip
# - Intel Mac: kali-linux-YYYY.X-amd64-utm.zip
# From: https://www.kali.org/get-kali/#kali-virtual-machines
```

### 2. Set Up Kali VM

1. Extract the downloaded `.utm` file
2. Double-click to import into UTM
3. Edit VM settings → Network → Change to "Bridged Network"
4. Start the VM
5. Login with username: `kali`, password: `kali`

### 3. Configure SSH Access

In the Kali VM terminal:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable ssh
sudo systemctl start ssh
```

On your Mac terminal:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/kali_mcp -N ""

# Copy key to VM (replace IP with your VM's IP)
ssh-copy-id -i ~/.ssh/kali_mcp.pub kali@192.168.X.X

# Test connection
ssh -i ~/.ssh/kali_mcp kali@192.168.X.X
```

### 4. Install MCP Server

```bash
# Clone this repository
git clone https://github.com/elcamino666/kali-mcp.git
cd kali-mcp

# Update vm-config.json with your VM's IP address
nano vm-config.json

# Run setup
./setup.sh
```

### 5. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kali-vm": {
      "command": "node",
      "args": ["/path/to/kali-mcp/index.js"]
    }
  }
}
```

Restart Claude Desktop.

## Available MCP Tools

### `kali_exec`
Execute any command in the Kali VM.

```
Example: "Run nmap -sn 192.168.1.0/24"
```

### `kali_install`
Install packages using apt-get.

```
Example: "Install wireshark and tcpdump"
```

### `kali_list_tools`
List installed security tools.

### `kali_vm_status`
Check VM connection status and system info.

## Usage Examples

Once configured, ask Claude:

- "Scan my local network for active devices"
- "Check if port 80 is open on 192.168.1.1"
- "Install metasploit-framework in the Kali VM"
- "Show me the Kali VM status"

## Wireless Security Testing

To use external WiFi adapters for wireless attacks:

1. Purchase a compatible USB WiFi adapter (e.g., Alfa AWUS036NHA)
2. Plug it into your Mac
3. In UTM: VM Settings → USB → Add USB Device → Select your adapter
4. In Kali VM: Verify with `iwconfig` and `sudo airmon-ng`

## Architecture

```
Claude Desktop
    ↓ (stdio)
MCP Server (Node.js)
    ↓ (SSH)
Kali Linux VM (UTM)
    ↓ (Network)
Local Network / Target Systems
```

## Configuration

Edit `vm-config.json` to update VM connection settings:

```json
{
  "host": "192.168.2.212",
  "port": 22,
  "username": "kali",
  "privateKeyPath": "/Users/username/.ssh/kali_mcp",
  "workingDirectory": "/home/kali"
}
```

## Troubleshooting

**"Cannot connect to VM"**
- Ensure VM is running in UTM
- Check VM's IP address: `ip addr show` in Kali terminal
- Update `vm-config.json` with correct IP
- Test SSH: `ssh -i ~/.ssh/kali_mcp kali@<VM_IP>`

**"Permission denied"**
- Verify SSH key exists: `ls -la ~/.ssh/kali_mcp`
- Reinstall public key: `ssh-copy-id -i ~/.ssh/kali_mcp.pub kali@<VM_IP>`

**"VM can't access local network"**
- Verify bridged networking is enabled in UTM settings
- Check VM has IP on same subnet as your Mac

## Security Notes

⚠️ **This tool provides powerful security testing capabilities. Use responsibly:**

- Only test networks and devices you own or have explicit authorization to test
- Wireless attacks should only target your own devices
- Be aware of local laws regarding security testing and penetration testing
- Keep the VM isolated and shut down when not in use

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- [ssh2](https://github.com/mscdex/ssh2) for SSH connectivity
- [Kali Linux](https://www.kali.org/) for security tools
- [UTM](https://mac.getutm.app/) for virtualization
