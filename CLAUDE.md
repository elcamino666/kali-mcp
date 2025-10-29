# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides access to Kali Linux security tools through a Kali Linux VM running in UTM. The server runs as a Node.js application that communicates with Claude Desktop via stdio transport and executes commands in the Kali VM via SSH.

## Architecture

### Core Components

1. **MCP Server (index.js)**: Node.js server implementing the MCP protocol
   - Uses `@modelcontextprotocol/sdk` for MCP communication
   - Uses `ssh2` library for SSH connections to the Kali VM
   - Implements 4 tools: `kali_exec`, `kali_install`, `kali_list_tools`, `kali_vm_status`

2. **Kali Linux VM**: UTM virtual machine running Kali Linux ARM64
   - Runs on macOS via UTM virtualization
   - Bridged networking for direct local network access
   - SSH server enabled for remote command execution
   - Pre-configured with security tools (nmap, metasploit, aircrack-ng, etc.)

3. **VM Configuration (vm-config.json)**: Connection settings
   - VM IP address on local network
   - SSH username and private key path
   - Working directory for command execution

4. **Communication Flow**:
   - Claude Desktop → stdio → MCP Server (index.js) → SSH → Kali VM

### Key Architecture Patterns

- **VM Management**: The MCP server does NOT start/stop the VM. The VM must be running in UTM before using the MCP server.
- **SSH Authentication**: Uses SSH key authentication (no password prompts). Key stored at `~/.ssh/kali_mcp`
- **Command Execution**: All commands executed via SSH with automatic working directory change
- **Error Handling**: Connection errors provide helpful troubleshooting steps

## Development Commands

### Initial Setup

The VM must be configured in UTM first. Then:

```bash
# Install Node.js dependencies
npm install

# Test SSH connection to VM
ssh -i ~/.ssh/kali_mcp kali@192.168.2.212

# Test MCP server starts
node index.js
```

### VM Management

```bash
# The VM is managed through UTM GUI
# Start: Open UTM → Select Kali VM → Click Play
# Stop: Click Stop in UTM
# Settings: Click info button (ⓘ) in UTM
```

### Running the MCP Server

The server is designed to be called by Claude Desktop via the config file:

```bash
npm start
```

The server runs on stdio and expects MCP protocol messages on stdin.

### Testing Tools

To test security tools work correctly in the VM:

```bash
# SSH into the VM
ssh -i ~/.ssh/kali_mcp kali@192.168.2.212

# Test tools directly
nmap --version
sudo airmon-ng
metasploit --version
```

## Important Implementation Details

### VM Network Configuration

The VM uses **bridged networking** to access the local network directly:
- VM has its own IP address on the local network (e.g., 192.168.2.212)
- Can scan and interact with local network devices
- Required for wireless security testing and network scanning

### SSH Key Authentication

The MCP server uses SSH key authentication stored at `~/.ssh/kali_mcp`:
- Public key installed in VM's `~/.ssh/authorized_keys`
- Private key read by Node.js on each connection
- No password prompts during operation

### VM Configuration File

`vm-config.json` contains:
```json
{
  "host": "192.168.2.212",          // VM's IP address
  "port": 22,                        // SSH port
  "username": "kali",                // SSH username
  "privateKeyPath": "/Users/...",    // Path to SSH private key
  "workingDirectory": "/home/kali"   // Default working directory
}
```

**Important**: Update the `host` IP address if the VM's IP changes (DHCP lease renewal).

### Adding New MCP Tools

To add new tools, modify `index.js`:

1. **Add tool definition** in `setupHandlers()` method around line 38:
```javascript
{
  name: 'new_tool_name',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '...' }
    },
    required: ['param1']
  }
}
```

2. **Add case handler** in the switch statement around line 97:
```javascript
case 'new_tool_name':
  return await this.newToolMethod(args.param1);
```

3. **Implement the method** in the `KaliMCPServer` class:
```javascript
async newToolMethod(param) {
  const command = `some-command ${param}`;
  return await this.executeCommand(command);
}
```

### Installing New Tools in Kali VM

SSH into the VM and install packages:
```bash
ssh -i ~/.ssh/kali_mcp kali@192.168.2.212
sudo apt update
sudo apt install -y package-name
```

Or use the `kali_install` MCP tool from Claude Desktop.

### Wireless Security Testing Setup

For WiFi access point creation and wireless attacks:

1. **External WiFi Adapter Required**: Plug in a supported USB WiFi adapter (e.g., Alfa AWUS036NHA)

2. **USB Passthrough in UTM**:
   - Stop the VM
   - Edit VM settings → USB
   - Add USB device → Select WiFi adapter
   - Start VM

3. **Verify Adapter in VM**:
```bash
iwconfig
sudo airmon-ng
```

4. **Create Rogue AP**:
```bash
sudo hostapd /path/to/hostapd.conf
```

### Troubleshooting

**MCP Server Can't Connect to VM**:
1. Verify VM is running in UTM
2. Check VM's IP: `ssh kali@192.168.2.212 'ip addr'`
3. Update `vm-config.json` if IP changed
4. Test SSH: `ssh -i ~/.ssh/kali_mcp kali@192.168.2.212`

**VM Can't Access Local Network**:
1. Verify bridged networking is enabled in UTM settings
2. Check VM has IP on local network subnet
3. Test connectivity: `ping 192.168.2.1` from inside VM

**Tools Not Working**:
1. Verify tools are installed: `dpkg -l | grep package-name`
2. Install missing tools: `sudo apt install package-name`
3. Check for permission issues: some tools require `sudo`

## Security Notes

This MCP server provides powerful security testing capabilities. Use responsibly:
- Only test on networks and devices you own or have authorization to test
- Wireless attacks should only target your own devices
- Be aware of local laws regarding security testing
- Keep the VM isolated when not in use
