# Weekly Report Skill

A Claude Desktop skill that generates a weekly report from GitHub (and optionally Slack / Notion), then delivers it via Email, LINE, and LinkedIn. Includes a Q&A auto-check loop to monitor and reply to incoming messages.

## Prerequisites

Only three things must be present on your machine:

| Tool | Install (macOS) | Install (Windows) | Install (Linux) | Why |
|---|---|---|---|---|
| [GitHub CLI (`gh`)](https://cli.github.com) | `brew install gh` | `winget install GitHub.cli` | `apt install gh` / [other](https://github.com/cli/cli#installation) | Fetches your GitHub activity |
| [Node.js](https://nodejs.org) (provides `npx`) | `brew install node` | `winget install OpenJS.NodeJS` | `apt install nodejs npm` / [nvm](https://github.com/nvm-sh/nvm) | Runs the Playwright MCP server |
| [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) | `npx -y @playwright/mcp --version` | same | same | Auto-installs on first run; also warms the cache so Claude Desktop doesn't race on it later |

The skill checks these during Step 0 Phase 0 and tells you the exact install command for your OS if anything is missing.

**Optional** — enable only if you want these data sources / fallback:

| MCP Server | Source | Adds |
|---|---|---|
| Slack MCP | `https://mcp.slack.com/mcp` | Pulls Slack messages into the report |
| Notion MCP | `https://mcp.notion.com/mcp` | Pulls Notion pages into the report |
| Chrome DevTools MCP | `npx chrome-devtools-mcp` | Fallback if Playwright fails |

## Claude Desktop MCP Config

Open **Settings → Developer → Edit Config**. Claude Desktop will open the config file at:

- **macOS** — `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows** — `%APPDATA%\Claude\claude_desktop_config.json` (i.e. `C:\Users\<you>\AppData\Roaming\Claude\claude_desktop_config.json`)
- **Linux** — `~/.config/Claude/claude_desktop_config.json`

Add two Playwright entries that share a session. Examples below — **replace the `command` and `--user-data-dir` values with absolute paths on your machine**.

**macOS / Linux:**

```json
{
  "mcpServers": {
    "playwright-login": {
      "command": "/Users/<you>/.nvm/versions/node/<ver>/bin/npx",
      "args": [
        "-y", "@playwright/mcp",
        "--user-data-dir", "/Users/<you>/Library/Application Support/Claude/playwright-session"
      ]
    },
    "playwright-headless": {
      "command": "/Users/<you>/.nvm/versions/node/<ver>/bin/npx",
      "args": [
        "-y", "@playwright/mcp",
        "--headless",
        "--user-data-dir", "/Users/<you>/Library/Application Support/Claude/playwright-session"
      ]
    }
  }
}
```

**Windows** (note the `.cmd` suffix on `npx` and double-backslashes in JSON strings):

```json
{
  "mcpServers": {
    "playwright-login": {
      "command": "C:\\Users\\<you>\\AppData\\Roaming\\npm\\npx.cmd",
      "args": [
        "-y", "@playwright/mcp",
        "--user-data-dir", "C:\\Users\\<you>\\AppData\\Roaming\\Claude\\playwright-session"
      ]
    },
    "playwright-headless": {
      "command": "C:\\Users\\<you>\\AppData\\Roaming\\npm\\npx.cmd",
      "args": [
        "-y", "@playwright/mcp",
        "--headless",
        "--user-data-dir", "C:\\Users\\<you>\\AppData\\Roaming\\Claude\\playwright-session"
      ]
    }
  }
}
```

Why two entries:

- `playwright-login` opens a **visible** browser — used only when you need to log in manually or clear a captcha.
- `playwright-headless` runs **silent in the background** — used for everything else (sending email, LINE, LinkedIn DMs, Q&A monitoring, scheduled runs).
- Both point at the **same `--user-data-dir`** so the login session persists across modes — if they diverge, the headless server starts with no cookies and every send fails.

Three gotchas to avoid:

- **Use an absolute path for `command`.** Find it with `which npx` (macOS / Linux) or `where npx` / `Get-Command npx` (Windows cmd / PowerShell). On Windows the executable is `npx.cmd`, not bare `npx`. Bare `"npx"` fails because Claude Desktop launches without a login shell PATH.
- **Use `@playwright/mcp`, not `@playwright/mcp@latest`.** The `@latest` tag triggers a lazy-loading race in Claude Desktop that silently leaves the MCP server dead on first call.
- **Pick any writable absolute path for `--user-data-dir`.** Both entries must be identical. Use forward slashes on macOS / Linux, double-backslashes (`\\`) on Windows when encoded in JSON.

After editing: **fully quit Claude Desktop and reopen**, then start a *new* conversation:

- **macOS** — ⌘Q (or menu → Quit). Closing the window is not enough, the app keeps running in the menu bar.
- **Windows** — right-click the system-tray icon → Exit (Alt+F4 on the window alone also only hides it).
- **Linux** — close via the tray / system menu, or `pkill -f "Claude"` as a last resort.

MCP servers are loaded only at conversation start — the existing chat will not pick up config changes.

Slack / Notion / Chrome DevTools, if you want them, go in the same `mcpServers` block (local ones follow the same `command`/`args` shape; remote MCPs use `{ "url": "..." }` and will prompt for OAuth in Claude Desktop).

## Install the skill

```bash
git clone https://github.com/ryanlinjui/agent-backend-weekly-report
```

Then add the folder to Claude Code via `/install-skill`, or upload the `.skill` file through Claude Desktop's skill UI.

## Usage

| Command | What it does |
|---|---|
| `weekly report` / `週報` | Generate and send the weekly report |
| `qa` / `check replies` / `回覆` | Run one QA cycle (check Email + LINE for replies, auto-respond). Use this inside `/schedule` (local task, **permission mode = bypass**) for unattended monitoring. |

## How It Works

1. **Init** — Verify `gh` / `node` / `@playwright/mcp` / Claude Desktop config. Check GitHub / Slack / Notion access. Ask for email platform, recipients, LinkedIn targets. Login to Email, LINE, LinkedIn in a visible browser and verify each account.
2. **Fetch** — Pull activity from GitHub (always) plus Slack / Notion (if configured) for the reporting window.
3. **Draft** — Generate the report from the raw data.
4. **Approval** — Show the draft and ask for approval before sending.
5. **Send** — Email via `scripts/gmail-send.js` (per-recipient loop, avoids spam heuristics); LINE via `broadcast` API; LinkedIn DMs via `scripts/linkedin-dm.js`.
6. **Q&A** — Run this skill inside a Claude Desktop `/schedule` **local task** (with **permission mode = `bypass`** so tool calls run unattended). Each scheduled tick checks Email and LINE for replies and auto-responds using the report's raw data.

## Project Structure

```
.
├── SKILL.md              # Skill definition (main logic)
├── manifest.json         # Skill dependencies
├── scripts/              # Playwright MCP browser_run_code templates
│   ├── gmail-send.js
│   ├── linkedin-dm.js
│   ├── line-create-oa-fill.js
│   └── line-init.js
├── references/           # Per-flow docs (init / send)
└── config.json           # (generated; gitignored) Saved accounts, tokens, recipients
```

Browser session data is persisted by the agent under this skill's folder (exact location is the agent's choice).
