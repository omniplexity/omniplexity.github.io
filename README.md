# OmniAI

A privacy-first, local-only AI chat interface that connects to [LM Studio](https://lmstudio.ai/) running on your machine. Built with React, TypeScript, and Tailwind CSS.

![OmniAI Screenshot](docs/screenshot.png)

## Features

- **100% Private** — All data stays on your machine. No cloud, no tracking.
- **Streaming Responses** — Real-time typewriter effect like ChatGPT/Claude
- **Conversation History** — Stored locally in IndexedDB
- **Dark/Light Mode** — System preference detection + manual toggle
- **Agent Mode** — ReAct-style reasoning with tools (calculator, memory search)
- **Mobile Responsive** — Works great on phones and tablets
- **Keyboard Shortcuts** — Cmd+Enter to send, Cmd+N for new chat, etc.

## Quick Start

### 1. Install LM Studio

Download and install [LM Studio](https://lmstudio.ai/) on your computer.

### 2. Start the LM Studio Server

1. Open LM Studio
2. Download a model (e.g., `mistral-7b-instruct`, `llama-2-7b-chat`)
3. Load the model
4. Click **"Start Server"** in the Local Server tab
5. The server runs at `http://127.0.0.1:1234` by default

### 3. Run OmniAI

```bash
# Clone the repository
git clone https://github.com/yourusername/omniai.git
cd omniai

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment to GitHub Pages

### Option 1: GitHub Actions (Recommended)

1. Push your code to GitHub
2. Go to Settings → Pages → Source → GitHub Actions
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Option 2: Manual Deploy

```bash
npm run build
# Deploy the `dist` folder to your hosting provider
```

## Configuration

### LM Studio URL

By default, OmniAI connects to `http://127.0.0.1:1234/v1`. You can change this in Settings → Connection.

### Agent Mode

Enable Agent Mode in Settings → Agent to use the ReAct reasoning pattern with tools:

- **Calculator** — Solve math problems
- **Memory** — Search through conversation history

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Send message |
| `Cmd/Ctrl + N` | New chat |
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Cmd/Ctrl + /` | Focus input |
| `Escape` | Cancel streaming |

## Tech Stack

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **Dexie.js** — IndexedDB wrapper
- **LangChain.js** — Agent framework (tools only, no external calls)

## Project Structure

```
src/
├── components/
│   ├── chat/           # Chat UI components
│   ├── header/         # Header with model selector
│   ├── sidebar/        # Conversation list
│   ├── settings/       # Settings modal
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/
│   ├── agent/          # ReAct agent implementation
│   ├── db/             # IndexedDB persistence
│   ├── lmstudio/       # LM Studio client
│   └── utils/          # Utility functions
├── stores/             # Zustand state stores
└── types/              # TypeScript type definitions
```

## Privacy & Security

OmniAI is designed with privacy as a core principle:

- **No backend server** — Everything runs in your browser
- **No external API calls** — Only connects to your local LM Studio
- **Local storage only** — Conversations stored in IndexedDB
- **No telemetry** — Zero tracking or analytics
- **Open source** — Full code transparency

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Made with ♥ for local-first AI
