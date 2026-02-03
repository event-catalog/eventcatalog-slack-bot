import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModelV1 } from 'ai';
import { type AiProvider, DEFAULT_MODELS } from '../config/schema.js';

export function createAIProvider(provider: AiProvider, model?: string): LanguageModelV1 {
  const modelId = model || DEFAULT_MODELS[provider];

  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic();
      return anthropic(modelId);
    }
    case 'openai': {
      const openai = createOpenAI();
      return openai(modelId);
    }
    case 'google': {
      const google = createGoogleGenerativeAI();
      return google(modelId);
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
