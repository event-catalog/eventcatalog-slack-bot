import 'dotenv/config';
import { program } from 'commander';
import pc from 'picocolors';
import { loadConfig } from './config/loader.js';
import { validateEnv } from './config/env.js';
import { validateLicense } from './license/validate.js';
import { initializeMCPClient, MCPConnectionError } from './mcp/client.js';
import { createAIProvider } from './ai/provider.js';
import { createSlackApp, startSlackApp } from './bot/app.js';

program
  .name('eventcatalog-slack-bot')
  .description('Slack bot for querying EventCatalog via MCP')
  .version('1.0.0')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    try {
      console.log(pc.bold(pc.blue('EventCatalog Slack Bot')));
      console.log();

      // Validate EventCatalog Scale license
      await validateLicense();
      console.log(pc.green('✓ License validated'));

      // Load configuration
      const config = await loadConfig(options.config);
      console.log(pc.green('✓ Configuration loaded'));

      // Validate environment variables
      validateEnv(config.ai.provider);
      console.log(pc.green('✓ Environment variables validated'));

      // Initialize MCP client and get tools
      const mcpClient = await initializeMCPClient(config);
      console.log(pc.green('✓ MCP client connected'));

      // Create AI provider
      const model = createAIProvider(config.ai.provider, config.ai.model);
      console.log(pc.green(`✓ AI provider initialized (${config.ai.provider})`));

      // Create and start Slack app
      const app = createSlackApp({
        model,
        mcpClient,
        config,
      });

      await startSlackApp(app);
      console.log(pc.green('✓ Slack bot started'));
      console.log();
      console.log(pc.bold('Bot is running! Mention it in Slack to ask questions.'));

      // Handle graceful shutdown
      const shutdown = async () => {
        console.log();
        console.log(pc.yellow('Shutting down...'));

        try {
          await app.stop();
          console.log(pc.dim('Slack app stopped'));
        } catch {
          // Ignore
        }

        try {
          await mcpClient.close();
        } catch {
          // Ignore
        }

        console.log(pc.green('Goodbye!'));
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      if (error instanceof MCPConnectionError) {
        console.error(pc.red('✗ Failed to connect to EventCatalog'));
        console.error();
        console.error(error.message);
        console.error();
      } else {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  });

program.parse();
