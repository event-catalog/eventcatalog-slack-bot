# EventCatalog Slack Bot

<img width="428" height="454" alt="Screenshot 2026-02-03 at 09 53 31" src="https://github.com/user-attachments/assets/c41969b7-621f-49c4-aafd-9bf50de285b6" />


A self-hosted Slack bot that connects to an EventCatalog MCP server, allowing users to query their eventcatalog documentation directly from Slack.

> **Note:** This bot requires an [EventCatalog Scale](https://eventcatalog.cloud) license.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Slack App Setup](#slack-app-setup)
  - [Option A: Create from Manifest](#option-a-create-from-manifest-recommended)
  - [Option B: Create Manually](#option-b-create-manually)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Config File](#config-file)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
  - [Docker](#docker)
  - [Railway](#railway)
  - [Fly.io](#flyio)
  - [Render](#render)
  - [AWS / GCP / Azure](#aws--gcp--azure)
- [Usage](#usage)
  - [@Mention in Any Channel](#mention-in-any-channel)
  - [Dedicated #ask-eventcatalog Channel](#dedicated-ask-eventcatalog-channel)
  - [Thread Context](#thread-context)
- [Supported AI Providers](#supported-ai-providers)
- [Troubleshooting](#troubleshooting)

## Architecture

1. User @mentions the bot (e.g., `@eventcatalog Tell me about the OrderCreated event`)
2. Bot connects to your EventCatalog MCP server and queries your documentation
3. AI-powered response is posted back to the user in a thread

## Prerequisites

- Node.js 22+
- An [EventCatalog Scale](https://eventcatalog.cloud) license
- An EventCatalog instance with MCP enabled
- A Slack workspace where you can create apps
- An API key for your chosen AI provider (Anthropic, OpenAI, or Google)

## Slack App Setup

You can create the Slack app either using a manifest (recommended) or manually.

### Option A: Create from Manifest (Recommended)

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From an app manifest**
3. Select your workspace and click **Next**
4. Choose **YAML** and paste the following manifest:

```yaml
display_information:
  name: EventCatalog Bot
  description: Query your EventCatalog directly from Slack
  background_color: "#000000"

features:
  bot_user:
    display_name: EventCatalog
    always_online: true

oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - reactions:read
      - reactions:write
      - channels:history

settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

5. Click **Next**, review the summary, and click **Create**
6. After creation, go to **Basic Information** → **App-Level Tokens**
7. Click **Generate Token and Scopes**:
   - Name: `socket-mode-token`
   - Add scope: `connections:write`
8. Click **Generate** and copy the token (starts with `xapp-`) - this is your `SLACK_APP_TOKEN`
9. Go to **OAuth & Permissions** and click **Install to Workspace**
10. Copy the **Bot User OAuth Token** (starts with `xoxb-`) - this is your `SLACK_BOT_TOKEN`
11. Go to **Basic Information** → **App Credentials** and copy the **Signing Secret** - this is your `SLACK_SIGNING_SECRET`

### Option B: Create Manually

#### 1. Create the Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name your app (e.g., "EventCatalog Bot") and select your workspace
4. Click **Create App**

##### 2. Enable Socket Mode

1. In the left sidebar, click **Socket Mode**
2. Toggle **Enable Socket Mode** to On
3. When prompted, create an App-Level Token:
   - Name: `socket-mode-token`
   - Scope: `connections:write`
4. Click **Generate**
5. Copy the token (starts with `xapp-`) - this is your `SLACK_APP_TOKEN`

#### 3. Configure OAuth & Permissions

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll to **Scopes** → **Bot Token Scopes**
3. Add these scopes:
   - `app_mentions:read` - Receive @mention events
   - `chat:write` - Send messages
   - `reactions:read` - Read reactions
   - `reactions:write` - Add/remove reactions
   - `channels:history` - Read public channel messages (for thread context)

#### 4. Enable Events

1. In the left sidebar, click **Event Subscriptions**
2. Toggle **Enable Events** to On
3. Expand **Subscribe to bot events**
4. Add these events:
   - `app_mention`
   - `message.channels` (if using auto-reply channels)

#### 5. Install the App

1. In the left sidebar, click **OAuth & Permissions**
2. Click **Install to Workspace**
3. Review permissions and click **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`) - this is your `SLACK_BOT_TOKEN`

#### 6. Get the Signing Secret

1. In the left sidebar, click **Basic Information**
2. Scroll to **App Credentials**
3. Copy the **Signing Secret** - this is your `SLACK_SIGNING_SECRET`

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# EventCatalog Scale License (Required)
EVENTCATALOG_SCALE_LICENSE_KEY=XXXX-XXXX-XXXX-XXXX-XXXX-XXXX

# Slack (Required)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# AI Provider (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Config File

Create `eventcatalog-bot.config.ts`:

```typescript
export default {
  eventCatalog: {
    url: 'https://your-catalog.example.com',
    // Optional: Add authentication headers
    // headers: {
    //   'Authorization': 'Bearer your-token',
    // },
  },
  ai: {
    provider: 'anthropic', // 'anthropic' | 'openai' | 'google'
    // model: 'claude-sonnet-4-20250514', // Optional: override default model
    maxSteps: 5,
    temperature: 0.4,
  },
  slack: {
    // Optional: Channel IDs for auto-reply (bot responds to all messages)
    autoReplyChannels: [],
    // Optional: Custom icon URL for bot messages
    icon: 'https://your-domain.com/bot-icon.png',
    // Optional: Custom display name for bot messages
    username: 'EventCatalog',
  },
};
```

## Running Locally

### Install Dependencies

```bash
pnpm install
```

### Start the Bot

```bash
pnpm dev
```

Or with a custom config path:

```bash
pnpm dev --config ./my-config.ts
```

## Deployment

The bot uses Socket Mode, so it doesn't need a public URL or incoming webhooks - it maintains an outbound WebSocket connection to Slack. This makes it easy to deploy anywhere.

### Docker

```bash
# Build the image
docker build -t eventcatalog-slack-bot .

# Run with docker-compose
docker compose up -d

# View logs
docker compose logs -f
```

#### Docker Networking Requirements

When running the bot in Docker, the container needs to reach your EventCatalog server. The approach depends on where EventCatalog is running:

**EventCatalog running locally (on your host machine):**

The bot container cannot use `localhost` to reach your host machine. You have two options:

1. **Use `host.docker.internal`** (recommended for local development):

   Update your `eventcatalog-bot.config.ts`:
   ```typescript
   eventCatalog: {
     url: 'http://host.docker.internal:3000',
   }
   ```

   > **Note:** This requires your EventCatalog server to bind to all interfaces (`0.0.0.0`), not just `localhost`. Check your EventCatalog startup - if it only shows `localhost:3000`, you may need to start it with a `--host 0.0.0.0` flag or equivalent configuration.

2. **Run the bot outside Docker** for local development:
   ```bash
   pnpm install
   pnpm dev
   ```
   This avoids networking complexity and is often simpler during development.

**EventCatalog running in Docker:**

Put both containers on the same Docker network and use the container name as the hostname:

```yaml
# docker-compose.yml
services:
  eventcatalog:
    # your eventcatalog config
    networks:
      - app-network

  eventcatalog-slack-bot:
    build: .
    env_file:
      - .env
    volumes:
      - ./eventcatalog-bot.config.ts:/app/eventcatalog-bot.config.ts:ro
    networks:
      - app-network

networks:
  app-network:
```

Then in your config:
```typescript
eventCatalog: {
  url: 'http://eventcatalog:3000',
}
```

**EventCatalog deployed to a public URL:**

Simply use the public URL - no special configuration needed:
```typescript
eventCatalog: {
  url: 'https://your-catalog.example.com',
}
```

### Railway

1. Create a new project and connect your repository
2. Add environment variables in the Railway dashboard:
   - `EVENTCATALOG_SCALE_LICENSE_KEY`
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `ANTHROPIC_API_KEY` (or your chosen provider)
3. Add your `eventcatalog-bot.config.ts` to the repository
4. Deploy - Railway will automatically detect the Dockerfile

### Fly.io

```bash
# Install flyctl and login
fly launch --no-deploy

# Set secrets
fly secrets set EVENTCATALOG_SCALE_LICENSE_KEY=your-key
fly secrets set SLACK_BOT_TOKEN=xoxb-...
fly secrets set SLACK_APP_TOKEN=xapp-...
fly secrets set SLACK_SIGNING_SECRET=...
fly secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
fly deploy
```

### Render

1. Create a new **Background Worker** (not a Web Service)
2. Connect your repository
3. Set the build command: `pnpm install && pnpm build`
4. Set the start command: `pnpm start`
5. Add environment variables in the Render dashboard
6. Deploy

### AWS / GCP / Azure

Deploy as a container or long-running process. Since the bot uses Socket Mode, it doesn't need:
- Load balancers
- Public endpoints
- SSL certificates

Just ensure the process stays running and can make outbound HTTPS/WSS connections.

## Usage

There are two ways to interact with the bot:

### @Mention in Any Channel

Invite the bot to any channel and @mention it to ask questions:

```
@eventcatalog Tell me about the OrderCreated event
```

```
@eventcatalog What services consume the InventoryUpdated event?
```

```
@eventcatalog List all events in the Orders domain
```

The bot will reply in a thread to keep channels organized.

### Dedicated #ask-eventcatalog Channel

Create a dedicated channel where the bot automatically responds to every message - no @mention needed. This gives your team a go-to place for architecture questions.

**Setup:**

1. Create a channel (e.g., `#ask-eventcatalog` or `#ask-eda`)
2. Invite the bot to the channel
3. Get the channel ID (right-click channel → View channel details → scroll to bottom)
4. Add the channel ID to your config:

```typescript
slack: {
  autoReplyChannels: ['C0123456789'],
}
```

Now anyone can post questions directly in the channel and get instant answers.

### Thread Context

When you interact with the bot in a thread, it automatically reads the conversation history. This allows for natural follow-up questions:

- "Tell me more about that"
- "What are its consumers?"
- "Show me the schema"

Thread context works automatically in public channels. For private channels and DMs, optionally add these scopes to your Slack app:
- `groups:history` - Private channels
- `im:history` - Direct messages
- `mpim:history` - Group DMs

## Supported AI Providers

| Provider | Environment Variable | Default Model |
|----------|---------------------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.0-flash` |

## Troubleshooting

### Bot doesn't respond

1. Check that the bot is invited to the channel
2. Verify Socket Mode is enabled in Slack app settings
3. Check logs for connection errors

### "Missing API key" error

Ensure you have the correct API key set for your configured AI provider.

### MCP connection errors

1. Verify your EventCatalog URL is correct
2. Check that MCP is enabled in your EventCatalog
3. If using authentication, verify headers are correct

### Permission errors

Review the OAuth scopes in your Slack app and ensure all required scopes are added.

## License

Copyright (c) EventCatalog Ltd. All rights reserved.

Usage of this software requires a valid [EventCatalog Scale](https://eventcatalog.cloud) license.
