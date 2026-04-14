# Weekly Report Skill

A Claude Desktop skill that generates a weekly report from GitHub (and optionally Slack / Notion), then delivers it via Email, LINE, and LinkedIn. Includes a Q&A auto-check loop to monitor and reply to incoming messages.

Browser automation is driven end-to-end by [Microsoft Playwright CLI](https://github.com/microsoft/playwright-cli) (`@playwright/cli`). No Playwright MCP, no Chrome DevTools MCP, no "Claude in Chrome" — one CLI, two named sessions, one persistent profile.

## Prerequisites

Three CLIs must be present on your machine. The skill checks these during Step 0 Phase 0 and tells you the exact install command for your OS if anything is missing.

| Tool | Install (macOS) | Install (Windows) | Install (Linux) | Why |
|---|---|---|---|---|
| [GitHub CLI (`gh`)](https://cli.github.com) | `brew install gh` | `winget install GitHub.cli` | `apt install gh` / [other](https://github.com/cli/cli#installation) | Fetches your GitHub activity |
| [Node.js](https://nodejs.org) (provides `npm`) | `brew install node` | `winget install OpenJS.NodeJS` | `apt install nodejs npm` / [nvm](https://github.com/nvm-sh/nvm) | Runs `@playwright/cli` |
| [`@playwright/cli`](https://github.com/microsoft/playwright-cli) | `npm install -g @playwright/cli@latest` | same | same | All browser automation (send Email, LINE OA setup, LinkedIn DM, Q&A monitoring) |

After installing `@playwright/cli`, install a browser once:

```bash
playwright-cli install-browser chrome
```

This is idempotent — safe to re-run.

**Optional** — enable only if you want these data sources:

| MCP Server | Source | Adds |
|---|---|---|
| Slack MCP | `https://mcp.slack.com/mcp` | Pulls Slack messages into the report |
| Notion MCP | `https://mcp.notion.com/mcp` | Pulls Notion pages into the report |

If you want Slack / Notion as report sources, add their entries to Claude Desktop's MCP config (**Settings → Developer → Edit Config**) and restart the app. `@playwright/cli` itself does **not** need any Claude Desktop MCP entry — it's a plain CLI.

## How `@playwright/cli` is used

The skill uses two named sessions sharing one persistent browser profile:

| Session | Mode | Purpose |
|---|---|---|
| `weekly-report` | headless | All automated sends, QA, identity checks |
| `weekly-report-login` | headed | Manual login only (visible browser) |

Both open with `--persistent --profile=.browser-session` (relative to the skill's folder) so cookies persist across runs and are shared between modes. Only one session is open at a time — Chromium lockfiles on the shared profile mean the other must be closed first.

Session open / close idioms used throughout the skill:

```bash
# Headless — everything except manual login
playwright-cli -s=weekly-report open <URL> --persistent --profile=.browser-session

# Headed — only for user-driven login / reCAPTCHA
playwright-cli -s=weekly-report-login open <URL> --headed --persistent --profile=.browser-session

# Close (mandatory before switching modes)
playwright-cli -s=weekly-report close
playwright-cli -s=weekly-report-login close
```

Templates in `scripts/` are executed via `playwright-cli run-code --filename=...` after the skill substitutes placeholders (`__TO__`, `__SUBJECT__`, etc.) and writes the result to `.pw-tmp/`. The `--raw` flag yields stdout as exact JSON of the template's return value — e.g. `{"sent":true}`.

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

1. **Init** — Verify `gh` / `node` / `@playwright/cli`. Check GitHub / Slack / Notion access. Ask for email platform, recipients, LinkedIn targets. Login to Email, LINE, LinkedIn in the `weekly-report-login` headed session and verify each account. Session cookies persist to `.browser-session/`.
2. **Fetch** — Pull activity from GitHub (always) plus Slack / Notion (if configured) for the reporting window.
3. **Draft** — Generate the report from the raw data.
4. **Approval** — Show the draft and ask for approval before sending.
5. **Send** — Email via `scripts/gmail-send.js` (per-recipient loop, avoids spam heuristics); LINE via the Messaging API `broadcast` endpoint (`curl`, no browser); LinkedIn DMs via `scripts/linkedin-dm.js`. All browser-scripted sends run on the `weekly-report` headless session.
6. **Q&A** — Run this skill inside a Claude Desktop `/schedule` **local task** (with **permission mode = `bypass`** so tool calls run unattended). Each scheduled tick checks Email and LINE for replies and auto-responds using the report's raw data.

## Project Structure

```
.
├── SKILL.md              # Skill definition (main logic)
├── manifest.json         # Skill dependencies
├── scripts/              # playwright-cli run-code templates
│   ├── gmail-send.js
│   ├── gmail-qa-check.js
│   ├── gmail-qa-reply.js
│   ├── linkedin-dm.js
│   ├── line-create-oa-fill.js
│   ├── line-init.js
│   ├── line-qa-check.js
│   └── line-qa-reply.js
├── references/           # Per-flow docs (init / send)
├── config.json           # (generated; gitignored) Saved accounts, tokens, recipients
├── .browser-session/     # (generated; gitignored) Chromium profile shared by both sessions
└── .pw-tmp/              # (generated; gitignored) Substituted template files for run-code
```
