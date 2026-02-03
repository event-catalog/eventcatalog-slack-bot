import { generateText, type CoreMessage } from 'ai';
import type { LanguageModelV1 } from 'ai';
import pc from 'picocolors';
import type { MCPClient } from '../mcp/client.js';
import { getSystemPrompt } from './system-prompt.js';
import type { Config } from '../config/schema.js';

export interface AgentOptions {
  model: LanguageModelV1;
  mcpClient: MCPClient;
  config: Config;
}

export interface AgentResponse {
  text: string;
  toolCalls?: Array<{
    toolName: string;
    args: unknown;
  }>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type StatusCallback = (status: string) => void | Promise<void>;

const searchingMessages = [
  'Searching your catalog...',
  'Diving into your architecture...',
  'Consulting the catalog...',
  'Hunting for answers...',
  'Scanning your architecture...',
];

function getRandomSearchingMessage(): string {
  return searchingMessages[Math.floor(Math.random() * searchingMessages.length)];
}

export async function runAgent(
  message: string,
  options: AgentOptions,
  conversationHistory?: ConversationMessage[],
  onStatusChange?: StatusCallback
): Promise<AgentResponse> {
  const { model, mcpClient, config } = options;

  const systemPrompt = getSystemPrompt(config.eventCatalog.url);

  // Build messages array with conversation history
  const messages: CoreMessage[] = [];

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add the current user message
  messages.push({
    role: 'user',
    content: message,
  });

  // Notify that we're starting with a fun message
  if (onStatusChange) {
    await onStatusChange(getRandomSearchingMessage());
  }

  const collectedToolCalls: Array<{ toolName: string; args: unknown }> = [];

  const result = await generateText({
    model,
    system: systemPrompt,
    messages,
    tools: mcpClient.tools,
    maxSteps: config.ai.maxSteps,
    temperature: config.ai.temperature,
    onStepFinish: async (step) => {
      // Collect tool calls from this step
      if (step.toolCalls && step.toolCalls.length > 0) {
        for (const call of step.toolCalls) {
          collectedToolCalls.push({
            toolName: call.toolName,
            args: call.args,
          });
          console.log(pc.dim(`Tool call: ${call.toolName}`), call.args);
        }

        // Notify about tool calls
        if (onStatusChange) {
          const toolNames = collectedToolCalls.map((t) => t.toolName);
          const uniqueTools = [...new Set(toolNames)];
          await onStatusChange(`Querying EventCatalog: ${uniqueTools.join(', ')}`);
        }
      }

      // Log tool results
      if (step.toolResults && step.toolResults.length > 0) {
        for (const result of step.toolResults) {
          const resultStr = JSON.stringify(result.result);
          const truncated = resultStr.length > 500 ? resultStr.slice(0, 500) + '...' : resultStr;
          console.log(pc.dim(`Tool result (${result.toolName}):`), truncated);
        }
      }
    },
  });

  // Notify that we're generating the response
  if (onStatusChange) {
    await onStatusChange('Generating response...');
  }

  return {
    text: result.text,
    toolCalls: collectedToolCalls.length > 0 ? collectedToolCalls : undefined,
  };
}
