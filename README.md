# Weekly Report Skill

A Claude Code skill that generates weekly reports from GitHub, Slack, and Notion, then delivers via Email, LINE, and LinkedIn. Includes a Q&A auto-check loop to monitor and reply to incoming messages.

## Prerequisites

### CLI Tools

| Tool | Install | Purpose |
|---|---|---|
| [GitHub CLI (`gh`)](https://cli.github.com) | `brew install gh` | Fetch GitHub activity |
| [Node.js](https://nodejs.org) | `brew install node` | Required by MCP servers (npx) |

### MCP Servers

These are declared in `manifest.json` and must be connected in Claude Desktop:

| MCP Server | Source | Purpose |
|---|---|---|
| Playwright | `npx @playwright/mcp@latest` | Browser automation (send email, LinkedIn DM, LINE OA screenshots) |
| Slack | `https://mcp.slack.com/mcp` | Fetch Slack messages as report data source |
| Notion | `https://mcp.notion.com/mcp` | Fetch Notion pages as report data source |
| Chrome DevTools | `npx chrome-devtools-mcp@latest` | Fallback browser automation if Playwright fails |

### Accounts Required

| Service | What you need |
|---|---|
| GitHub | Authenticated via `gh auth login` |
| Slack | Workspace access (connected via Slack MCP) |
| Notion | Workspace access (connected via Notion MCP) |
| Email | Any webmail account (Gmail, Outlook, Yahoo, etc.) |
| LINE | A [LINE Official Account](https://manager.line.biz) with Messaging API enabled |
| LinkedIn | A LinkedIn account for sending DMs |

## Install

### Option 1: Clone

```bash
git clone https://github.com/ryanlinjui/agent-backend-weekly-report
```

Then add the skill folder path to Claude Code via `/install-skill` or the skill settings.

### Option 2: Skill file

Upload `weekly-report.skill` via Claude Desktop's skill upload UI.

## Setup MCP Servers (Manual, Required)

MCP servers are **NOT auto-installed** by the skill. You must manually add each one in Claude Desktop before using the skill.

Go to **Claude Desktop > Settings > MCP Servers** and add each server:

### Playwright

Add as a local MCP server:

```json
{
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

### Slack

Add as a remote MCP server with URL: `https://mcp.slack.com/mcp`

After adding, Claude Desktop will prompt you to complete the OAuth flow. Authorize access to your Slack workspace.

### Notion

Add as a remote MCP server with URL: `https://mcp.notion.com/mcp`

After adding, Claude Desktop will prompt you to complete the OAuth flow. Authorize access to your Notion workspace.

### Chrome DevTools

Add as a local MCP server:

```json
{
  "command": "npx",
  "args": ["chrome-devtools-mcp@latest"]
}
```

### Verify

After adding all servers, restart Claude Desktop. You can verify they are connected by checking **Settings > MCP Servers** — each server should show a green status.

## Usage

| Command | What it does |
|---|---|
| `weekly report` / `週報` | Generate and send the weekly report |
| `qa` / `check replies` / `回覆` | Start Q&A monitoring loop for replies |

## How It Works

1. **Init** - Verify GitHub, Slack, Notion access. Ask for email platform, recipients, LinkedIn targets. Login to Email, LINE, LinkedIn via browser. Verify all accounts.
2. **Fetch** - Pull activity from GitHub, Slack, Notion for the reporting window.
3. **Draft** - Generate report from raw data.
4. **Approval** - Show draft to user for review before sending.
5. **Send** - Deliver via Email (Playwright), LINE (Broadcast API), LinkedIn (Playwright).
6. **Q&A** - Monitor Email and LINE for replies every 15 minutes, auto-respond based on report data.

## Project Structure

```
.
├── SKILL.md              # Skill definition (main logic)
├── manifest.json         # Dependencies and MCP server declarations
├── references/
│   ├── init-email.md     # Email login flow
│   ├── init-line.md      # LINE OA setup flow
│   └── report-template.md # Report format template
├── config.json           # (generated) Saved accounts, recipients, tokens
└── .browser-session/     # (generated) Playwright browser session data
```
