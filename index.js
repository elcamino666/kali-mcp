#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load VM configuration
const config = JSON.parse(readFileSync(join(__dirname, 'vm-config.json'), 'utf8'));

class KaliMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'kali-vm-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'kali_exec',
          description: 'Execute a command in the Kali Linux VM',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to execute (e.g., "nmap -sV 192.168.1.1")',
              },
              workdir: {
                type: 'string',
                description: 'Working directory (optional, defaults to /home/kali)',
                default: config.workingDirectory,
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'kali_install',
          description: 'Install additional tools in Kali Linux VM',
          inputSchema: {
            type: 'object',
            properties: {
              packages: {
                type: 'string',
                description: 'Space-separated list of packages to install',
              },
            },
            required: ['packages'],
          },
        },
        {
          name: 'kali_list_tools',
          description: 'List installed Kali Linux tools',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'kali_vm_status',
          description: 'Check the status of the Kali Linux VM connection',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'kali_exec':
            return await this.executeCommand(args.command, args.workdir || config.workingDirectory);

          case 'kali_install':
            return await this.installPackages(args.packages);

          case 'kali_list_tools':
            return await this.listTools();

          case 'kali_vm_status':
            return await this.getVMStatus();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async executeCommand(command, workdir = config.workingDirectory) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = '';
      let errorOutput = '';

      conn.on('ready', () => {
        // Change to working directory and execute command
        const fullCommand = `cd ${workdir} && ${command}`;

        conn.exec(fullCommand, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          stream.on('close', (code, signal) => {
            conn.end();
            const fullOutput = output + errorOutput;

            resolve({
              content: [
                {
                  type: 'text',
                  text: `Command: ${command}\nWorking Directory: ${workdir}\nExit Code: ${code}\n\nOutput:\n${fullOutput || '(no output)'}`,
                },
              ],
            });
          }).on('data', (data) => {
            output += data.toString('utf8');
          }).stderr.on('data', (data) => {
            errorOutput += data.toString('utf8');
          });
        });
      }).on('error', (err) => {
        reject(new Error(`SSH connection error: ${err.message}`));
      });

      // Connect using SSH key
      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: readFileSync(config.privateKeyPath),
      });
    });
  }

  async installPackages(packages) {
    const command = `sudo apt-get update && sudo apt-get install -y ${packages}`;
    return await this.executeCommand(command);
  }

  async listTools() {
    const command = 'dpkg -l | grep -E "nmap|metasploit|aircrack|wireshark|sqlmap"';
    return await this.executeCommand(command);
  }

  async getVMStatus() {
    return new Promise((resolve, reject) => {
      const conn = new Client();

      conn.on('ready', () => {
        conn.exec('uname -a && uptime && ip addr show | grep "inet "', (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }

          let output = '';

          stream.on('close', () => {
            conn.end();

            resolve({
              content: [
                {
                  type: 'text',
                  text: `VM Status:\nHost: ${config.host}\nUsername: ${config.username}\nConnection: Active\n\nSystem Info:\n${output}`,
                },
              ],
            });
          }).on('data', (data) => {
            output += data.toString('utf8');
          });
        });
      }).on('error', (err) => {
        resolve({
          content: [
            {
              type: 'text',
              text: `VM Connection Error:\nHost: ${config.host}\nError: ${err.message}\n\nPlease ensure:\n1. Kali VM is running in UTM\n2. SSH is enabled in the VM\n3. Network configuration is correct`,
            },
          ],
          isError: true,
        });
      });

      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: readFileSync(config.privateKeyPath),
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kali VM MCP server running on stdio');
  }
}

const server = new KaliMCPServer();
server.run().catch(console.error);
