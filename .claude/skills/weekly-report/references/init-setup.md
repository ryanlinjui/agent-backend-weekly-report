# Init & Health Check

Auto-check all services and install missing MCP servers on first run.

## Required config (.env)

| Variable | Purpose | How to verify |
|---|---|---|
| `GITHUB_USERNAME` | GitHub user to query | `gh auth status` returns OK |
| `REPORT_RECIPIENTS` | Email addresses | Non-empty |
| `REPORT_WINDOW_DAYS` | Days to look back (default: 7) | Non-empty |
| `GMAIL_USER` | Gmail sender account | Non-empty |
| `SLACK_USER_TOKEN` | Slack User Token for search | `curl` auth.test returns OK |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API | `curl` bot/info returns OK |

## 0a: Health check

Run all checks in parallel. Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Service health check
  GitHub:  ✅ / ❌ (gh auth status)
  Gmail:   ✅ / ❌ (Chrome DevTools MCP connected)
  Slack:   ✅ / ❌ (Slack MCP connected)
  Notion:  ✅ / ❌ (Notion MCP connected)
  LINE:    ✅ / ❌ (LINE Bot MCP connected)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If everything ✅, return to SKILL.md pipeline.

## 0b: Auto-install missing MCP servers

### Detect environment

- Claude Code: `claude --version` succeeds → use `claude mcp add-json`
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` exists → edit with Write tool

### Install each missing MCP

**LINE Bot MCP** (if `mcp__line-bot__*` tools not available):
```bash
# Claude Code:
claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<read from .env>"}}'
```
For Claude Desktop, merge into `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "line-bot": {
      "command": "npx",
      "args": ["@line/line-bot-mcp-server"],
      "env": {
        "CHANNEL_ACCESS_TOKEN": "<read from .env>"
      }
    }
  }
}
```

**Slack MCP** (plugin): Print `⚠️ Run /mcp → connect Slack plugin`

**Notion MCP** (plugin): Print `⚠️ Run /mcp → connect Notion plugin`

**Chrome DevTools MCP** (plugin): Print `⚠️ Run /plugin → install chrome-devtools-mcp`

**GitHub**: Print `⚠️ Run 'gh auth login' in terminal`

### Ask user for remaining manual steps

Print ONE combined message:
```
⚠️ First-time setup (one-time only):
  {list only items that need user action}

Please complete these, then say "ok".
```

If no manual steps needed, skip to verification.

Wait for "ok" / "done" / "好了" — only if manual steps exist.

### Verify

Re-run health check. If all ✅, return to pipeline.
For Claude Desktop: `⚠️ Please restart Claude Desktop to apply MCP changes, then say "ok".`

## User interaction principle

User only interacts for:
1. **First-run setup** — connect MCPs (once only)
2. **Approving the report** — review draft → send

Everything else is automated.
