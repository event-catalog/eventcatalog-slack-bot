import { describe, it, expect } from 'vitest';
import { configSchema, DEFAULT_MODELS } from './schema.js';

describe('configSchema', () => {
  describe('eventCatalog configuration', () => {
    it('requires a valid URL', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://eventcatalog.example.com' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URLs', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'not-a-url' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional headers', () => {
      const result = configSchema.safeParse({
        eventCatalog: {
          url: 'https://eventcatalog.example.com',
          headers: { Authorization: 'Bearer token' },
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventCatalog.headers).toEqual({
          Authorization: 'Bearer token',
        });
      }
    });
  });

  describe('ai configuration', () => {
    it('defaults to anthropic provider', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ai.provider).toBe('anthropic');
      }
    });

    it('accepts openai provider', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { provider: 'openai' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ai.provider).toBe('openai');
      }
    });

    it('accepts google provider', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { provider: 'google' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ai.provider).toBe('google');
      }
    });

    it('rejects invalid providers', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { provider: 'invalid-provider' },
      });
      expect(result.success).toBe(false);
    });

    it('defaults maxSteps to 5', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ai.maxSteps).toBe(5);
      }
    });

    it('enforces maxSteps between 1 and 20', () => {
      const tooLow = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { maxSteps: 0 },
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { maxSteps: 21 },
      });
      expect(tooHigh.success).toBe(false);

      const valid = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { maxSteps: 10 },
      });
      expect(valid.success).toBe(true);
    });

    it('defaults temperature to 0.4', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ai.temperature).toBe(0.4);
      }
    });

    it('enforces temperature between 0 and 2', () => {
      const tooLow = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { temperature: -0.1 },
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        ai: { temperature: 2.1 },
      });
      expect(tooHigh.success).toBe(false);
    });
  });

  describe('slack configuration', () => {
    it('defaults to empty autoReplyChannels', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slack.autoReplyChannels).toEqual([]);
      }
    });

    it('accepts autoReplyChannels list', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        slack: { autoReplyChannels: ['C123', 'C456'] },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slack.autoReplyChannels).toEqual(['C123', 'C456']);
      }
    });

    it('accepts optional icon URL', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        slack: { icon: 'https://example.com/icon.png' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid icon URL', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        slack: { icon: 'not-a-url' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional username', () => {
      const result = configSchema.safeParse({
        eventCatalog: { url: 'https://example.com' },
        slack: { username: 'EventCatalog Bot' },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slack.username).toBe('EventCatalog Bot');
      }
    });
  });
});

describe('DEFAULT_MODELS', () => {
  it('defines a model for each provider', () => {
    expect(DEFAULT_MODELS.anthropic).toBeDefined();
    expect(DEFAULT_MODELS.openai).toBeDefined();
    expect(DEFAULT_MODELS.google).toBeDefined();
  });

  it('uses Claude Sonnet 4 for Anthropic', () => {
    expect(DEFAULT_MODELS.anthropic).toContain('claude-sonnet-4');
  });

  it('uses GPT-4o for OpenAI', () => {
    expect(DEFAULT_MODELS.openai).toBe('gpt-4o');
  });

  it('uses Gemini 2.0 Flash for Google', () => {
    expect(DEFAULT_MODELS.google).toContain('gemini-2.0-flash');
  });
});
