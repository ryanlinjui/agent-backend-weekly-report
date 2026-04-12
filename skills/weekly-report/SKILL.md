---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Use when user says "weekly report", "週報", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

Read `.env`. If missing or keys empty, create it. For each service, use `ToolSearch` to find its tools, then call one to test. If auth needed, the system opens a browser — user logs in, skill continues.

| Service | How to check | If ❌ |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |
| Email | Test SMTP via `scripts/email-client.py` | Open App Password page with Playwright → user logs in → skill creates App Password automatically → save to `.env` |
| Slack | Call any Slack MCP tool | System handles OAuth automatically |
| Notion | Call any Notion MCP tool | System handles OAuth automatically |
| LINE | Call LINE Bot MCP `get_message_quota` | See [references/init-line.md](references/init-line.md) |
| LinkedIn | Call LinkedIn MCP `get_inbox` | MCP opens login browser automatically |

**After ALL ✅, ask user: "報告要寄給誰？"** Save recipients to `.env`.

Browser automation: **only use Playwright** (search `ToolSearch("playwright")`). Only show visible browser for login pages. All other automation = headless.

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
3. Never ask user to choose during init — just do it.
