# AI Web Terminal

A browser-based terminal-style AI chat app that connects to any LM Studio server. Built with the Ghostty "Box" theme aesthetic — dark background, bright green text, scanlines, CRT glow.

> **Warning:** This project was vibe coded with Claude Code. It may contain bugs, rough edges, and questionable architectural decisions. Use at your own risk. PRs welcome.

## Features

- Terminal-style UI with Ghostty Box theme colors
- User signup/login with bcrypt-hashed passwords
- Streaming responses from LM Studio (OpenAI-compatible API)
- Thinking model support (auto-hides `<think>` blocks)
- Slash commands with autocomplete (`/model`, `/server`, `/system`, `/stop`, `/cls`, `/help`, `/logout`)
- System prompt encryption (AES-256-GCM, derived from user password)
- Mobile-first PWA (installable, standalone mode)
- Copy button on each message
- SQLite database (zero external dependencies)
- Dockerized

## Prerequisites

- Node.js 20+
- [LM Studio](https://lmstudio.ai/) running with a model loaded and server started

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

Open [http://localhost:8800](http://localhost:8800)

## Production

```bash
npm run build
npm run start
```

## Docker

```bash
# Build and run
docker compose up --build

# Or manually
docker build -t ai-web-terminal .
docker run -p 8800:8800 -v awt-data:/app/data ai-web-terminal
```

The app will be available at [http://localhost:8800](http://localhost:8800)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `ai-web-terminal-secret-change-me` | Secret for signing JWT tokens |
| `DB_PATH` | `./data/app.db` | Path to SQLite database file |
| `PORT` | `8800` | Server port |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/model` | Select AI model from LM Studio |
| `/server` | Configure LM Studio server URL |
| `/system` | Set/clear encrypted system prompt |
| `/stop` | Stop current AI response |
| `/cls` | Clear chat history |
| `/help` | Show available commands |
| `/logout` | Log out |

## LM Studio Setup

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load a model
3. Start the local server (default: `http://localhost:1234`)
4. In the app, use `/server` to configure the URL if different

## Tech Stack

Next.js 15 (App Router), TypeScript, Tailwind CSS, SQLite (better-sqlite3), bcryptjs, jose (JWT), Web Crypto API (AES-256-GCM)
