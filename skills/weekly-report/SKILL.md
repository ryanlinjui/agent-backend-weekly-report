---
name: weekly-report
description: Generate and send a weekly report summarizing the producer's activity across GitHub, Slack, and Notion. Delivers via Email, LINE, and LinkedIn DM. Use when the user asks for "weekly report", "週報", "my week in review", or similar.
compatibility: Requires gh CLI. MCP servers auto-installed via plugin .mcp.json (Slack, Notion, LINE Bot, LinkedIn, Playwright).
---

# Weekly Report

## Language detection

Auto-detect the user's language. Do NOT ask. Priority:
1. User's message language (if any text accompanies the command)
2. OS locale (`defaults read NSGlobalDomain AppleLocale 2>/dev/null || echo $LANG`)
3. Slack message language (after fetching in Step 1)

Use detected language for ALL output.

## Pipeline

### Step 0: Init & health check

Read `.env`. **Before marking any service as ❌, use `ToolSearch` to check if its tools already exist** — plugin MCPs from `.mcp.json` are auto-installed. Try calling the tool first; only mark ❌ if the call actually fails. For each failing service, follow its init reference — no asking, no options, no AskUserQuestion:

1. [init-github.md](references/init-github.md)
2. [init-email.md](references/init-email.md)
3. [init-slack.md](references/init-slack.md)
4. [init-notion.md](references/init-notion.md)
5. [init-line.md](references/init-line.md)
6. [init-linkedin.md](references/init-linkedin.md)

Print [assets/health-check-template.md](assets/health-check-template.md). Do NOT proceed until ALL ✅.

### Step 1: Fetch raw data

Compute window: `W_start` = now − `REPORT_WINDOW_DAYS` days, `W_end` = now.

| Source | Reference | Tool |
|---|---|---|
| GitHub | [references/fetch-github.md](references/fetch-github.md) | `gh` CLI |
| Slack | [references/fetch-slack.md](references/fetch-slack.md) | Slack MCP |
| Notion | [references/fetch-notion.md](references/fetch-notion.md) | Notion MCP |

Keep raw output in working memory. If a source fails, warn and continue.

### Step 2: Draft

Read [assets/report-template.md](assets/report-template.md). Follow [references/draft-rules.md](references/draft-rules.md). **Every item must trace to raw data. Never fabricate.**

### Step 3: Approval gate

Read [assets/approval-gate-template.md](assets/approval-gate-template.md), substitute variables, print, and **WAIT**.

| Input | Action |
|---|---|
| `1` / `送出` / `send` | → Step 4 |
| `2` / `修改` | edit → reprint |
| `3` / `重新生成` | re-draft (no re-fetch) → reprint |
| `4` / `取消` / `cancel` | STOP |
| `dry run` | print draft, return |

**Never auto-select option 1.**

### Step 4: Send

| Channel | Reference | Method |
|---|---|---|
| Email | [references/send-email.md](references/send-email.md) | SMTP via scripts/email-client.py |
| LINE | [references/send-line.md](references/send-line.md) | LINE Bot MCP broadcast |
| LinkedIn | [references/send-linkedin.md](references/send-linkedin.md) | Playwright → LinkedIn web |

Each channel independent — if one fails, continue.

### Step 5: Summary

Print delivery summary (✅ / ❌ / ⚠️ per channel).

## Hard rules

1. Never send without explicit approval at Step 3.
2. Never fabricate — every item must trace to raw data.
3. Never skip init — all services must be ✅ first.
4. Never re-fetch during regenerate.
5. Never hardcode config — read from `.env`.
6. Never ask user to choose during init — auto-do everything, only pause for physical interaction (password, SMS, `/mcp`).
7. **Browser fallback chain** — use `ToolSearch` (search `navigate`) to find browser tools. Only use tools containing `chrome-devtools` or `playwright` in their name. Try in order: Chrome DevTools → Playwright login → Playwright headless. **NEVER use "Claude in Chrome" tools, `open` bash command, or any other browser method.** NEVER stop after one fails — try ALL before manual instructions.
8. **Headless by default** — only show a visible browser window when the user MUST physically type (login password, SMS code). All other browser operations MUST use headless/invisible browser.
9. **NEVER use AskUserQuestion during init.** Do NOT show option menus, radio buttons, or skip buttons. Print plain text messages only. If user must act (login, /mcp), print a simple message and wait for their next message — do NOT create interactive UI elements.
