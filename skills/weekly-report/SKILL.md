---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Use when user says "weekly report", "週報", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

**CRITICAL: Before checking any service, scan the `<system-reminder>` tags in the conversation for the deferred tools list. Tools follow the pattern `mcp__plugin_weekly-report_<server>__<tool>`. A service is "not installed" ONLY if zero tools match its prefix in that list. NEVER claim a tool is unavailable without checking the deferred list first.**

Read `.env`. If missing or keys empty, create it. For each service, find its tools in the deferred list by prefix, then call one to test.

| Service | Tool prefix to find in deferred tools | Test call | If ❌ |
|---|---|---|---|
| GitHub | N/A (use `gh` CLI) | `gh auth status` | `gh auth login --web` |
| Email | N/A (use `scripts/email-client.py`) | SMTP send test | See [init-email.md](references/init-email.md) |
| Slack | `mcp__*slack*` | `slack_read_user_profile` | System handles OAuth automatically |
| Notion | `mcp__*notion*` | `notion-get-users` | System handles OAuth automatically |
| LINE | `mcp__*line*` | `get_message_quota` | See [init-line.md](references/init-line.md) |
| LinkedIn | `mcp__*linkedin*` | `get_inbox` | MCP opens login browser automatically |

**After ALL ✅, ask user: "報告要寄給誰？"** Save recipients to `.env`.

### Browser automation

**Only use Playwright.** Find tools matching `mcp__*playwright*` in the deferred list.
- `playwright-login` tools (visible browser) → for login pages where user must type password
- `playwright-headless` tools (invisible) → for all post-login automation

**Do NOT use:** "Claude in Chrome" tools, `open` bash command, or anything else.

## Step 1: Fetch

Compute window (`REPORT_WINDOW_DAYS` days back). Fetch from GitHub (`gh` CLI), Slack (MCP), Notion (MCP). Keep raw data.

## Step 2: Draft

Follow [references/report-template.md](references/report-template.md). Every item must trace to raw data. Never fabricate.

## Step 3: Approval

Show draft + recipients. User picks: `1` send / `2` edit / `3` regenerate / `4` cancel. **Never auto-send.**

## Step 4: Send

Email (SMTP), LINE (broadcast MCP), LinkedIn (Playwright DM). Each independent — if one fails, continue.

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. Never ask user to choose during init — just do it. **NEVER use AskUserQuestion.** Plain text only.
4. **ALL init must complete before ANY fetch.** Finish Step 0 entirely first.
