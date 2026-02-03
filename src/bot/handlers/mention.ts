import type { App } from '@slack/bolt';
import pc from 'picocolors';
import type { BotContext } from '../app.js';
import { runAgent, type ConversationMessage } from '../../ai/agent.js';
import { markdownToSlack } from '../../formatters/markdown-to-slack.js';

interface ThreadMessage {
  text?: string;
  user?: string;
  bot_id?: string;
  ts?: string;
}

interface SlackClient {
  conversations: {
    replies: (params: {
      channel: string;
      ts: string;
      limit?: number;
    }) => Promise<{ messages?: ThreadMessage[] }>;
  };
}

async function getThreadHistory(
  client: SlackClient,
  channel: string,
  threadTs: string,
  currentTs: string,
  botUserId: string
): Promise<ConversationMessage[]> {
  try {
    const result = await client.conversations.replies({
      channel,
      ts: threadTs,
      limit: 20, // Limit context to last 20 messages
    });

    if (!result.messages || result.messages.length === 0) {
      return [];
    }

    const history: ConversationMessage[] = [];

    for (const msg of result.messages as ThreadMessage[]) {
      // Skip the current message (we'll add it separately)
      if (msg.ts === currentTs) {
        continue;
      }

      // Skip messages without text
      if (!msg.text) {
        continue;
      }

      // Determine if this is a bot message or user message
      const isBot = !!msg.bot_id;

      // Clean the message text (remove bot mentions)
      const cleanText = msg.text.replace(/<@[A-Z0-9]+>/g, '').trim();

      if (!cleanText) {
        continue;
      }

      history.push({
        role: isBot ? 'assistant' : 'user',
        content: cleanText,
      });
    }

    return history;
  } catch (error) {
    console.error(pc.dim('Failed to fetch thread history:'), error);
    return [];
  }
}

export function registerMentionHandler(app: App, context: BotContext): void {
  let botUserId: string | undefined;

  app.event('app_mention', async ({ event, client, say }) => {
    const { text, channel, ts, thread_ts } = event;

    // Get bot user ID on first mention (for identifying bot messages in threads)
    if (!botUserId) {
      try {
        const authResult = await client.auth.test();
        botUserId = authResult.user_id as string;
      } catch {
        botUserId = '';
      }
    }

    // Remove the bot mention from the message
    const userMessage = text.replace(/<@[A-Z0-9]+>/g, '').trim();

    // Message options with optional icon and username
    const messageOptions: {
      icon_url?: string;
      username?: string;
    } = {};
    if (context.config.slack.icon) {
      messageOptions.icon_url = context.config.slack.icon;
    }
    if (context.config.slack.username) {
      messageOptions.username = context.config.slack.username;
    }

    if (!userMessage) {
      await say({
        text: "Hi! I'm your EventCatalog assistant. Ask me about events, services, domains, or any other resources in your catalog.",
        thread_ts: thread_ts || ts,
        ...messageOptions,
      });
      return;
    }

    console.log(pc.cyan(`Received mention: "${userMessage}"`));

    // Post initial status message in thread
    let statusMessageTs: string | undefined;
    const threadTs = thread_ts || ts;

    try {
      const statusResult = await client.chat.postMessage({
        channel,
        thread_ts: threadTs,
        text: '_Processing request..._',
        ...messageOptions,
      });
      statusMessageTs = statusResult.ts;
    } catch {
      // Continue without status message if it fails
    }

    // Helper to update status message
    const updateStatus = async (status: string) => {
      if (statusMessageTs) {
        try {
          await client.chat.update({
            channel,
            ts: statusMessageTs,
            text: `_${status}_`,
          });
        } catch {
          // Ignore update errors
        }
      }
    };

    try {
      // Fetch thread history if we're in a thread
      let conversationHistory: ConversationMessage[] | undefined;

      if (thread_ts) {
        console.log(pc.dim('Fetching thread history...'));
        conversationHistory = await getThreadHistory(
          client as unknown as SlackClient,
          channel,
          thread_ts,
          ts,
          botUserId || ''
        );
        if (conversationHistory.length > 0) {
          console.log(
            pc.dim(`Found ${conversationHistory.length} messages in thread`)
          );
        }
      }

      // Run the AI agent with conversation history and status updates
      const response = await runAgent(
        userMessage,
        {
          model: context.model,
          mcpClient: context.mcpClient,
          config: context.config,
        },
        conversationHistory,
        updateStatus
      );

      // Log tool calls if any
      if (response.toolCalls) {
        console.log(
          pc.dim(
            `Tool calls: ${response.toolCalls.map((t) => t.toolName).join(', ')}`
          )
        );
      }

      // Check if we got a response
      if (!response.text || response.text.trim() === '') {
        console.log(pc.yellow('Warning: Empty response from AI agent'));
        const fallbackMessage = "I found information in your catalog but couldn't generate a response. Please try rephrasing your question.";

        if (statusMessageTs) {
          await client.chat.update({
            channel,
            ts: statusMessageTs,
            text: fallbackMessage,
          });
        } else {
          await say({
            text: fallbackMessage,
            thread_ts: threadTs,
            ...messageOptions,
          });
        }
        return;
      }

      // Convert markdown to Slack format
      let slackMessage = markdownToSlack(response.text);

      // Add tool calls footer if any tools were called
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolNames = [...new Set(response.toolCalls.map((t) => t.toolName))];
        slackMessage += `\n\n_Tools used: ${toolNames.join(', ')}_`;
      }

      // Truncate message if too long (Slack limit is ~40k characters)
      const maxLength = 39000;
      if (slackMessage.length > maxLength) {
        console.log(pc.yellow(`Warning: Response truncated from ${slackMessage.length} to ${maxLength} characters`));
        slackMessage = slackMessage.slice(0, maxLength) + '\n\n_...response truncated due to length_';
      }

      console.log(pc.dim(`Response length: ${slackMessage.length} characters`));

      // Update status message with final response
      if (statusMessageTs) {
        try {
          await client.chat.update({
            channel,
            ts: statusMessageTs,
            text: slackMessage,
          });
        } catch (updateError) {
          console.error(pc.yellow('Failed to update message, posting new one:'), updateError);
          // If update fails, post a new message
          await say({
            text: slackMessage,
            thread_ts: threadTs,
            ...messageOptions,
          });
        }
      } else {
        // No status message, post normally
        await say({
          text: slackMessage,
          thread_ts: threadTs,
          ...messageOptions,
        });
      }

      console.log(pc.green('Response sent successfully'));
    } catch (error) {
      console.error(pc.red('Error processing mention:'), error);

      const errorMessage = "Sorry, I encountered an error while processing your request. Please try again.";

      // Update status message with error or post new message
      if (statusMessageTs) {
        try {
          await client.chat.update({
            channel,
            ts: statusMessageTs,
            text: errorMessage,
          });
        } catch {
          await say({
            text: errorMessage,
            thread_ts: threadTs,
            ...messageOptions,
          });
        }
      } else {
        await say({
          text: errorMessage,
          thread_ts: threadTs,
          ...messageOptions,
        });
      }
    }
  });
}
