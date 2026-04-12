---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Use when user says "weekly report", "週報", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

Read `.env`. If missing or keys empty, create it. For each service, just call its tool directly to test. If it works → ✅. If auth needed, the system opens a browser — user logs in, skill continues. If fails → follow its init reference.

| Service | How to check | If ❌ |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |
| Email | Test SMTP via `scripts/email-client.py` | See [references/init-email.md](references/init-email.md) |
| Slack | Call any Slack MCP tool | System handles OAuth automatically |
| Notion | Call any Notion MCP tool | System handles OAuth automatically |
| LINE | Call LINE Bot MCP `get_message_quota` | See [references/init-line.md](references/init-line.md) |
| LinkedIn | Call LinkedIn MCP `get_inbox` | MCP opens login browser automatically |

**After ALL ✅, ask user: "報告要寄給誰？"** Save recipients to `.env`.

Browser automation: **only use Playwright MCP.** Tools are in the deferred tools list — just call them directly, no searching needed. Use `playwright-login` (visible) for login pages, `playwright-headless` (invisible) for post-login automation. Do NOT use "Claude in Chrome", `open` bash, or any other browser method.

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
3. Never ask user to choose during init — just do it. **NEVER use AskUserQuestion tool.** Print plain text only.
4. **ALL init must complete before ANY fetch.** Do NOT start fetching data while services are still ❌. Finish Step 0 entirely first.
