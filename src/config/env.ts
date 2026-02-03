import { z } from 'zod';
import type { AiProvider } from './schema.js';

const envSchema = z.object({
  SLACK_BOT_TOKEN: z.string().min(1, 'SLACK_BOT_TOKEN is required'),
  SLACK_APP_TOKEN: z.string().min(1, 'SLACK_APP_TOKEN is required'),
  SLACK_SIGNING_SECRET: z.string().min(1, 'SLACK_SIGNING_SECRET is required'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(provider: AiProvider): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Missing or invalid environment variables:\n${errors}`);
  }

  const env = result.data;

  // Check that the required API key for the selected provider is present
  const providerKeyMap: Record<AiProvider, keyof Env> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };

  const requiredKey = providerKeyMap[provider];
  if (!env[requiredKey]) {
    throw new Error(
      `Missing API key for provider "${provider}": ${requiredKey} is required`
    );
  }

  return env;
}
