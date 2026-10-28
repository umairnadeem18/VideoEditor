# VideoEditor — Research Agent

A cross-platform desktop app (Windows / macOS / Linux) built with **Tauri 2 + React + Tailwind**.

**What it does:** on first launch, a chat agent interviews you about who you are — fields of study, expertise, profile links (GitHub, Scholar, LinkedIn...), goals — and stores it as local profiles. After that, it fetches what's trending on GitHub, Hacker News and arXiv for *your* fields, ranks everything against your profile with a free-tier LLM (Groq / Gemini / OpenRouter), and writes you a Markdown trend brief you can save anywhere.

## Features
- Chat-based onboarding — answer once, never repeat yourself
- Multiple profiles with per-profile fields, links and enabled sources
- Free source connectors: GitHub search, Hacker News (Algolia), arXiv — official APIs only
- LLM analysis with automatic provider fallback chain
- One-click Markdown report export via native save dialog
- Chat history and saved briefs persisted in SQLite (app data dir)
- API keys stored in the OS credential store (Credential Manager / Keychain / Secret Service) — never in files, never in git

## Security & privacy
- Secrets live in the OS keyring; a local pre-commit hook blocks accidental key commits
- User data (profiles, chats, briefs) stays in your local SQLite database
- `.env`, tokens, databases and credentials are gitignored

## Development
```bash
pnpm install
pnpm tauri dev      # run the desktop app
pnpm tauri build    # build an installer for your OS
```

Requires: Node 18+, pnpm, Rust (stable), platform webview (WebView2 on Windows).