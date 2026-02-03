import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pc from 'picocolors';
import { configSchema, type Config } from './schema.js';

const CONFIG_FILES = [
  'eventcatalog-bot.config.ts',
  'eventcatalog-bot.config.js',
  'eventcatalog-bot.config.mjs',
];

export async function loadConfig(configPath?: string): Promise<Config> {
  const cwd = process.cwd();

  let filePath: string | undefined;

  if (configPath) {
    filePath = resolve(cwd, configPath);
    if (!existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`);
    }
  } else {
    for (const file of CONFIG_FILES) {
      const candidate = resolve(cwd, file);
      if (existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }
  }

  if (!filePath) {
    throw new Error(
      `No config file found. Create one of: ${CONFIG_FILES.join(', ')}`
    );
  }

  console.log(pc.dim(`Loading config from ${filePath}`));

  try {
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);
    const rawConfig = module.default || module;

    const result = configSchema.safeParse(rawConfig);

    if (!result.success) {
      const errors = result.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid config:\n${errors}`);
    }

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid config')) {
      throw error;
    }
    throw new Error(
      `Failed to load config file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
