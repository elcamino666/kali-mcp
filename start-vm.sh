#!/bin/bash

# Kali VM Auto-Start Script
# This script checks if the Kali VM is running and starts it if needed

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/vm-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: vm-config.json not found" >&2
    exit 1
fi

# Extract VM configuration
VM_HOST=$(node -p "JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8')).host" 2>/dev/null)
VM_USER=$(node -p "JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8')).username" 2>/dev/null)
KEY_PATH=$(node -p "JSON.parse(require('fs').readFileSync('$CONFIG_FILE', 'utf8')).privateKeyPath" 2>/dev/null)

# VM name in UTM (update this if your VM has a different name)
VM_NAME="Kali Linux 2023"

# Check if VM is already accessible via SSH
check_vm_running() {
    ssh -i "$KEY_PATH" -o ConnectTimeout=2 -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" 'exit' &>/dev/null
    return $?
}

# Start VM using UTM CLI
start_vm() {
    echo "Starting Kali VM..." >&2

    # Try using UTM's command line interface
    if command -v utmctl &> /dev/null; then
        utmctl start "$VM_NAME" 2>/dev/null
    else
        # Use AppleScript to start VM
        osascript <<EOF 2>/dev/null
tell application "UTM"
    activate
    delay 1
    set vmName to "$VM_NAME"
    try
        set targetVM to virtual machine named vmName
        start targetVM
    on error
        return "VM not found or already running"
    end try
end tell
EOF
    fi
}

# Wait for VM to be SSH accessible
wait_for_vm() {
    echo "Waiting for VM to be ready..." >&2
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if check_vm_running; then
            echo "✅ Kali VM is ready!" >&2
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "." >&2
        sleep 2
    done

    echo "" >&2
    echo "⚠️  Timeout waiting for VM to start" >&2
    return 1
}

# Main logic
echo "🔍 Checking Kali VM status..." >&2

if check_vm_running; then
    echo "✅ Kali VM is already running at $VM_HOST" >&2
    exit 0
fi

echo "⚠️  Kali VM is not running. Starting..." >&2

# Check if UTM is installed
if [ ! -d "/Applications/UTM.app" ]; then
    echo "❌ UTM is not installed. Please install it first." >&2
    exit 1
fi

# Start the VM
start_vm

# Wait for it to be ready
if wait_for_vm; then
    exit 0
else
    echo "❌ Failed to start VM. Please start it manually in UTM." >&2
    exit 1
fi
