---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Use when user says "weekly report", "週報", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

**First, scan the `<system-reminder>` tags in the conversation for the deferred tools list. A service is "not installed" ONLY if zero tools match in that list. NEVER claim a tool is unavailable without checking first.**

### Phase 1: Check services that don't need browser

| Service | How to check | If ❌ |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |
| Slack | Call any Slack MCP tool | System handles OAuth automatically |
| Notion | Call any Notion MCP tool | System handles OAuth automatically |

### Phase 2: Ask recipients

After Phase 1 services are ✅, ask user ONE question:

**「報告要寄給誰？請提供 Email, LINE, LinkedIn 的收件人。」**

Save to `.env` as `REPORT_RECIPIENTS`, `LINKEDIN_RECIPIENTS`.

### Phase 3: Init services that need Playwright (browser)

Now init the services that require browser login:

| Service | If ❌ |
|---|---|
| Email | See [init-email.md](references/init-email.md) — Playwright opens Google, user logs in, skill creates App Password |
| LINE | See [init-line.md](references/init-line.md) — Playwright opens LINE console, user logs in, skill creates token |
| LinkedIn | Call LinkedIn MCP tool — MCP opens login browser automatically |

**Browser: only use Playwright.** Visible browser for login pages only. Headless for everything else. Do NOT use "Claude in Chrome", `open` bash, or anything else.

**ALL init must complete before Step 1.**

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
4. ALL init must complete before ANY fetch.
