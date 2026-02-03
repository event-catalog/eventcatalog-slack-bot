import { App, type AppOptions } from '@slack/bolt';
import type { LanguageModelV1 } from 'ai';
import type { MCPClient } from '../mcp/client.js';
import type { Config } from '../config/schema.js';
import { registerMentionHandler } from './handlers/mention.js';
import { registerMessageHandler } from './handlers/message.js';

export interface BotContext {
  model: LanguageModelV1;
  mcpClient: MCPClient;
  config: Config;
}

export function createSlackApp(context: BotContext): App {
  const appOptions: AppOptions = {
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  };

  const app = new App(appOptions);

  // Register event handlers
  registerMentionHandler(app, context);
  registerMessageHandler(app, context);

  return app;
}

export async function startSlackApp(app: App): Promise<void> {
  await app.start();
}
