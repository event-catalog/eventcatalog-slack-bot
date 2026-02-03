export default {
  eventCatalog: {
    // URL of your EventCatalog instance
    url: 'http://localhost:3000',
    // Optional: Add authentication headers if needed
    // headers: {
    //   'Authorization': 'Bearer your-token',
    // },
  },
  ai: {
    // AI provider: 'anthropic' | 'openai' | 'google'
    provider: 'anthropic',
    // Optional: Override the default model
    // model: 'claude-sonnet-4-20250514',
    // Maximum number of tool-calling steps (1-20)
    maxSteps: 5,
    // Temperature for AI responses (0-2)
    temperature: 0.4,
  },
  slack: {
    // Optional: Channel IDs where the bot auto-replies to all messages
    // The bot will respond to every message in these channels without needing @mention
    autoReplyChannels: [],
    // Optional: Custom icon URL for bot messages
    icon: 'https://www.eventcatalog.dev/img/logo.png',
    // Optional: Custom username for bot messages
    username: 'EventCatalog',
  },
};
