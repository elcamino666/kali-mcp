#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Docker from 'dockerode';

const docker = new Docker();
const CONTAINER_NAME = 'kali-linux-mcp';

class KaliMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'kali-docker-mcp',
        version: '1.0.0',
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
          description: 'Execute a command in the Kali Linux Docker container',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The command to execute (e.g., "nmap -sV 192.168.1.1")',
              },
              workdir: {
                type: 'string',
                description: 'Working directory (optional, defaults to /root)',
                default: '/root',
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'kali_install',
          description: 'Install additional tools in Kali Linux container',
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
          name: 'kali_container_status',
          description: 'Check the status of the Kali Linux container',
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
            return await this.executeCommand(args.command, args.workdir || '/root');
          
          case 'kali_install':
            return await this.installPackages(args.packages);
          
          case 'kali_list_tools':
            return await this.listTools();
          
          case 'kali_container_status':
            return await this.getContainerStatus();
          
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

  async getContainer() {
    const containers = await docker.listContainers({ all: true });
    const container = containers.find(
      (c) => c.Names.includes(`/${CONTAINER_NAME}`) || c.Names.includes(CONTAINER_NAME)
    );
    
    if (!container) {
      throw new Error(`Container '${CONTAINER_NAME}' not found. Please start it with: docker-compose up -d`);
    }
    
    return docker.getContainer(container.Id);
  }

  async executeCommand(command, workdir = '/root') {
    const container = await this.getContainer();
    
    // Check if container is running
    const containerInfo = await container.inspect();
    if (!containerInfo.State.Running) {
      throw new Error('Container is not running. Start it with: docker-compose up -d');
    }

    const exec = await container.exec({
      Cmd: ['/bin/bash', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: workdir,
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      stream.on('data', (chunk) => {
        const data = chunk.toString('utf8');
        // Docker multiplexes stdout and stderr, first byte indicates stream type
        if (chunk[0] === 1) {
          output += data.slice(8); // stdout
        } else if (chunk[0] === 2) {
          errorOutput += data.slice(8); // stderr
        } else {
          output += data;
        }
      });

      stream.on('end', async () => {
        const execInfo = await exec.inspect();
        const fullOutput = output + errorOutput;
        
        resolve({
          content: [
            {
              type: 'text',
              text: `Command: ${command}\nWorking Directory: ${workdir}\nExit Code: ${execInfo.ExitCode}\n\nOutput:\n${fullOutput || '(no output)'}`,
            },
          ],
        });
      });

      stream.on('error', (err) => {
        reject(new Error(`Execution error: ${err.message}`));
      });
    });
  }

  async installPackages(packages) {
    const command = `apt-get update && apt-get install -y ${packages}`;
    return await this.executeCommand(command);
  }

  async listTools() {
    const command = 'dpkg -l | grep kali-tools';
    return await this.executeCommand(command);
  }

  async getContainerStatus() {
    try {
      const container = await this.getContainer();
      const info = await container.inspect();
      
      const status = {
        name: info.Name,
        id: info.Id.substring(0, 12),
        state: info.State.Status,
        running: info.State.Running,
        created: info.Created,
        image: info.Config.Image,
        ip: info.NetworkSettings.Networks?.['kali-mcp_kali-network']?.IPAddress || 'N/A',
      };

      return {
        content: [
          {
            type: 'text',
            text: `Container Status:\n${JSON.stringify(status, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting container status: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kali Docker MCP server running on stdio');
  }
}

const server = new KaliMCPServer();
server.run().catch(console.error);
