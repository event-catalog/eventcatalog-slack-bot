import type { App } from '@slack/bolt';
import pc from 'picocolors';
import type { BotContext } from '../app.js';
import { runAgent } from '../../ai/agent.js';
import { markdownToSlack } from '../../formatters/markdown-to-slack.js';

interface MessageEvent {
  text?: string;
  channel: string;
  ts: string;
  thread_ts?: string;
  subtype?: string;
  bot_id?: string;
}

export function registerMessageHandler(app: App, context: BotContext): void {
  const autoReplyChannels = context.config.slack.autoReplyChannels;

  // Skip if no auto-reply channels configured
  if (autoReplyChannels.length === 0) {
    return;
  }

  app.message(async ({ message, client, say }) => {
    const msg = message as MessageEvent;

    // Skip bot messages
    if (msg.subtype === 'bot_message' || msg.bot_id) {
      return;
    }

    // Skip messages not in auto-reply channels
    if (!autoReplyChannels.includes(msg.channel)) {
      return;
    }

    // Skip thread replies (only respond to top-level messages)
    if (msg.thread_ts && msg.thread_ts !== msg.ts) {
      return;
    }

    const userMessage = msg.text?.trim();
    if (!userMessage) {
      return;
    }

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

    console.log(
      pc.cyan(`Auto-reply message in ${msg.channel}: "${userMessage}"`)
    );

    // Post initial status message in thread
    let statusMessageTs: string | undefined;

    try {
      const statusResult = await client.chat.postMessage({
        channel: msg.channel,
        thread_ts: msg.ts,
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
            channel: msg.channel,
            ts: statusMessageTs,
            text: `_${status}_`,
          });
        } catch {
          // Ignore update errors
        }
      }
    };

    try {
      // Run the AI agent with status updates
      const response = await runAgent(
        userMessage,
        {
          model: context.model,
          mcpClient: context.mcpClient,
          config: context.config,
        },
        undefined,
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
            channel: msg.channel,
            ts: statusMessageTs,
            text: fallbackMessage,
          });
        } else {
          await say({
            text: fallbackMessage,
            thread_ts: msg.ts,
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
            channel: msg.channel,
            ts: statusMessageTs,
            text: slackMessage,
          });
        } catch (updateError) {
          console.error(pc.yellow('Failed to update message, posting new one:'), updateError);
          // If update fails, post a new message
          await say({
            text: slackMessage,
            thread_ts: msg.ts,
            ...messageOptions,
          });
        }
      } else {
        // No status message, post normally
        await say({
          text: slackMessage,
          thread_ts: msg.ts,
          ...messageOptions,
        });
      }

      console.log(pc.green('Auto-reply sent successfully'));
    } catch (error) {
      console.error(pc.red('Error processing auto-reply:'), error);

      const errorMessage = "Sorry, I encountered an error while processing your message. Please try again.";

      // Update status message with error or post new message
      if (statusMessageTs) {
        try {
          await client.chat.update({
            channel: msg.channel,
            ts: statusMessageTs,
            text: errorMessage,
          });
        } catch {
          await say({
            text: errorMessage,
            thread_ts: msg.ts,
            ...messageOptions,
          });
        }
      } else {
        await say({
          text: errorMessage,
          thread_ts: msg.ts,
          ...messageOptions,
        });
      }
    }
  });
}
