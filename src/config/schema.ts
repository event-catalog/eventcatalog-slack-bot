import { z } from 'zod';

export const aiProviderSchema = z.enum(['anthropic', 'openai', 'google']);

export type AiProvider = z.infer<typeof aiProviderSchema>;

export const configSchema = z.object({
  eventCatalog: z.object({
    url: z.string().url('EventCatalog URL must be a valid URL'),
    headers: z.record(z.string()).optional(),
  }),
  ai: z
    .object({
      provider: aiProviderSchema.default('anthropic'),
      model: z.string().optional(),
      maxSteps: z.number().min(1).max(20).default(5),
      temperature: z.number().min(0).max(2).default(0.4),
    })
    .default({}),
  slack: z
    .object({
      autoReplyChannels: z.array(z.string()).default([]),
      icon: z.string().url().optional(),
      username: z.string().optional(),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.0-flash',
};
