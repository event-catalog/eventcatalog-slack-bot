import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const setRequiredSlackEnv = () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
  };

  describe('Slack environment variables', () => {
    it('requires SLACK_BOT_TOKEN', () => {
      process.env.SLACK_APP_TOKEN = 'xapp-test';
      process.env.SLACK_SIGNING_SECRET = 'secret';
      process.env.ANTHROPIC_API_KEY = 'key';

      expect(() => validateEnv('anthropic')).toThrow('SLACK_BOT_TOKEN');
    });

    it('requires SLACK_APP_TOKEN', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test';
      process.env.SLACK_SIGNING_SECRET = 'secret';
      process.env.ANTHROPIC_API_KEY = 'key';

      expect(() => validateEnv('anthropic')).toThrow('SLACK_APP_TOKEN');
    });

    it('requires SLACK_SIGNING_SECRET', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test';
      process.env.SLACK_APP_TOKEN = 'xapp-test';
      process.env.ANTHROPIC_API_KEY = 'key';

      expect(() => validateEnv('anthropic')).toThrow('SLACK_SIGNING_SECRET');
    });
  });

  describe('AI provider API keys', () => {
    it('requires ANTHROPIC_API_KEY when using anthropic provider', () => {
      setRequiredSlackEnv();

      expect(() => validateEnv('anthropic')).toThrow('ANTHROPIC_API_KEY');
    });

    it('requires OPENAI_API_KEY when using openai provider', () => {
      setRequiredSlackEnv();

      expect(() => validateEnv('openai')).toThrow('OPENAI_API_KEY');
    });

    it('requires GOOGLE_GENERATIVE_AI_API_KEY when using google provider', () => {
      setRequiredSlackEnv();

      expect(() => validateEnv('google')).toThrow('GOOGLE_GENERATIVE_AI_API_KEY');
    });

    it('succeeds with all required Anthropic variables', () => {
      setRequiredSlackEnv();
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const result = validateEnv('anthropic');

      expect(result.SLACK_BOT_TOKEN).toBe('xoxb-test-token');
      expect(result.ANTHROPIC_API_KEY).toBe('sk-ant-test');
    });

    it('succeeds with all required OpenAI variables', () => {
      setRequiredSlackEnv();
      process.env.OPENAI_API_KEY = 'sk-test';

      const result = validateEnv('openai');

      expect(result.OPENAI_API_KEY).toBe('sk-test');
    });

    it('succeeds with all required Google variables', () => {
      setRequiredSlackEnv();
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key';

      const result = validateEnv('google');

      expect(result.GOOGLE_GENERATIVE_AI_API_KEY).toBe('google-key');
    });
  });

  describe('error messages', () => {
    it('provides clear error when provider key is missing', () => {
      setRequiredSlackEnv();

      expect(() => validateEnv('anthropic')).toThrow('Missing API key for provider "anthropic": ANTHROPIC_API_KEY is required');
    });
  });
});
