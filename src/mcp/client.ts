import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import pc from 'picocolors';
import type { Config } from '../config/schema.js';
import type { ToolSet } from 'ai';

export class MCPConnectionError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MCPConnectionError';
  }
}

export interface MCPClient {
  tools: ToolSet;
  close: () => Promise<void>;
}

export async function initializeMCPClient(config: Config): Promise<MCPClient> {
  const mcpUrl = `${config.eventCatalog.url}/docs/mcp`;

  console.log(pc.dim(`Connecting to EventCatalog MCP at ${mcpUrl}`));

  // Build environment variables including any custom headers
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
  };

  // Add custom headers as environment variables if needed
  if (config.eventCatalog.headers) {
    for (const [key, value] of Object.entries(config.eventCatalog.headers)) {
      env[`MCP_HEADER_${key.toUpperCase().replace(/-/g, '_')}`] = value;
    }
  }

  // Use npx to run the MCP client with SSE transport
  const transport = new StdioMCPTransport({
    command: 'npx',
    args: ['-y', 'mcp-remote', mcpUrl, '--allow-http'],
    env,
  });

  try {
    // Create and initialize the MCP client once
    const mcp = await createMCPClient({
      transport,
    });

    // Get the tools once at initialization
    const tools = await mcp.tools();

    console.log(pc.dim(`MCP client connected with ${Object.keys(tools).length} tools`));

    return {
      tools,
      close: async () => {
        await mcp.close();
        console.log(pc.dim('MCP client closed'));
      },
    };
  } catch (error) {
    // Check for connection refused error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionRefused =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('Connection closed');

    if (isConnectionRefused) {
      throw new MCPConnectionError(
        `Could not connect to EventCatalog at ${config.eventCatalog.url}\n\n` +
          `Please check:\n` +
          `  1. EventCatalog is running at ${config.eventCatalog.url}\n` +
          `  2. MCP is enabled in your EventCatalog configuration\n` +
          `  3. The URL is correct in eventcatalog-bot.config.ts`,
        mcpUrl,
        error instanceof Error ? error : undefined
      );
    }

    throw error;
  }
}
