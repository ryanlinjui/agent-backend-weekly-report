---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Includes Q&A auto-check loop. Use when user says "weekly report", "週報", "qa", "check replies", "回覆", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Pre-flight

**Skip this step if running from `/loop` (scheduled/recurring execution).** Only applies to interactive (user-initiated) runs.

Before doing anything else, output a message asking the user if they're ready to start (e.g. "Ready to start? Type anything to continue."). Do NOT use `AskUserQuestion` — the user must reply in the chat input box to trigger a second conversation iteration. This ensures MCP tools (Playwright, Slack, Notion, etc.) are fully loaded before any work begins.

**Do NOT call any tool or run any command until the user replies.**

## Step 0: Init

**All state lives in this skill's root folder**: `config.json` and `.browser-session/`. Never write to global/user-level paths. This enables scheduled tasks — the agent resolves its own folder from this SKILL.md's path.

**Playwright, Slack, Notion MCP tools are pre-configured via manifest. NEVER check if they're installed. NEVER try to install them. NEVER call any MCP tool until Step 1. Just trust they exist and use them when needed.**

First, read `config.json` (same folder as this SKILL.md) to check which services are already configured (skip their init).

### Phase 1: Check GitHub ONLY

**ONLY run `gh auth status`. Do NOT call ANY MCP tool (Playwright, Slack, Notion, or anything else). MCP tools are pre-installed — calling them too early causes false "unavailable" errors.**

| Service | How to check | If not ready |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |

### Phase 2: Ask recipients

After Phase 1 services are ready:

**Ask one question at a time. Wait for each answer before asking the next.**

1. Auto-detect sender email: run `gh api user --jq '.email'`. If available, show it and ask "Is this correct?" via `AskUserQuestion` with `options: ["Yes", "No"]`. If "No" or unavailable, ask user to type their email. Save as `email_user` to `config.json`.
2. Ask which email platform or webmail the user uses to send/read email (e.g. Gmail, Outlook, Yahoo, custom webmail, etc.). If the platform can be inferred from the email domain (e.g. `@gmail.com` → Gmail), confirm with the user. Otherwise ask them to provide the webmail URL. Save as `email_platform` (e.g. `"gmail"`, `"outlook"`, `"yahoo"`, `"custom"`) and `email_webmail_url` (e.g. `"https://mail.google.com"`) to `config.json`.
3. Ask who to send the report to — Email recipients. Save as `REPORT_RECIPIENTS` to `config.json`.
4. Ask for LinkedIn profile URLs of recipients. Save as `LINKEDIN_RECIPIENTS` to `config.json`. (LINE uses broadcast to all followers — no need to ask.)

### Phase 3: Browser login & verify accounts

**Login only — NEVER create new accounts on any platform.**

For each service, navigate with `playwright-headless` first. A previous session may exist but belong to someone else — **do NOT assume it is the user's.**

**For each service:**
1. Open the URL with `playwright-headless`
2. If already logged in → read the account identifier (email, username, account ID — **NEVER rely on display name alone**) → show to user via `AskUserQuestion` with `options: ["Yes, it's mine", "No, wrong account"]`
3. If wrong account or not logged in → **log out first if needed** → switch to `playwright-login` (visible browser) for user to log in manually → close visible browser
4. Save verified identity to `config.json`

| Service | URL | Verify by | Done when |
|---|---|---|---|
| GitHub | — (use `gh` CLI) | `gh api user --jq '.login, .email'` | login and email confirmed |
| Slack | — (use Slack MCP) | authenticated user email | email confirmed |
| Notion | — (use Notion MCP) | `notion-get-users` user email | email confirmed |
| Email | `email_webmail_url` from `config.json` | logged-in email address | matches `email_user` |
| LINE OA Manager | `https://manager.line.biz` | account ID or linked email | confirmed by user |
| LinkedIn | `https://www.linkedin.com` | profile URL or email from account settings | confirmed by user |

See [init-email.md](references/init-email.md) and [init-line.md](references/init-line.md) for details.

**Session persists across runs.** Subsequent operations use `playwright-headless` with the same `.browser-session/` — no re-login needed.

**Browser rules:** Only use Playwright. Visible browser for login only. Headless for everything else. Fallback: Chrome DevTools MCP if Playwright fails. Do NOT use `open` bash or anything else.

**ALL init must complete before Step 1.**

### Init Summary

After all phases complete, print a delivery summary table (values from verified identities in `config.json`):

| Platform | Via | Account | To |
|---|---|---|---|
| GitHub | `gh` CLI | `{github_user}` (`{github_name}`) | — (data source) |
| Slack | Slack MCP | `{slack_user}` @ `{slack_workspace}` | — (data source) |
| Notion | Notion MCP | `{notion_user}` | — (data source) |
| Email | `{email_platform}` | `{email_user}` | `{REPORT_RECIPIENTS}` |
| LINE | LINE Broadcast API | `{line_account_name}` | All followers (broadcast) |
| LinkedIn | Playwright | `{linkedin_profile_name}` | `{LINKEDIN_RECIPIENTS}` |

**⛔ STOP — If ANY service above is not configured, do NOT proceed past this point. Complete all phases of Step 0 first.**

## Step 1: Fetch

> REQUIRES: Step 0 fully completed (all services configured in config.json)

Compute window (`REPORT_WINDOW_DAYS` days back). Fetch from GitHub (`gh` CLI), Slack (MCP), Notion (MCP). Keep raw data.

## Step 2: Draft

> REQUIRES: Step 1 completed (raw data fetched)

Follow [references/report-template.md](references/report-template.md). Every item must trace to raw data. Never fabricate.

## Step 3: Approval

> REQUIRES: Step 2 completed (draft ready)

Show draft + recipients. Use `AskUserQuestion` with `options: ["Send", "Edit", "Regenerate", "Cancel"]` so the user gets clickable buttons. **Never auto-send.**

## Step 4: Send

> REQUIRES: Step 3 approved (user chose "Send")

Each channel independent. **Before operating on any browser-based channel (Email, LINE, LinkedIn), first navigate with `playwright-headless` and verify the logged-in account matches the expected identity in `config.json` (by email, username, or account ID — not display name).** Sessions may carry a different account from previous use. If mismatched → log out first, then re-login via `playwright-login`.

On failure:
1. Read the error message to diagnose the cause
2. If session expired or wrong account → re-login via `playwright-login`, then retry
3. If element not found → take screenshot, retry once with updated selectors
4. If still failing → try Chrome DevTools MCP as fallback
5. If all attempts fail → report what failed and why in plain language, continue other channels

**After each successful send, take a screenshot as proof and show it to the user.**

| Channel | How |
|---|---|
| Email | Read `email_platform` and `email_webmail_url` from `config.json` → Playwright headless → navigate to the saved webmail URL → Compose → fill To / Subject / Body → Send → screenshot sent confirmation. Agent must adapt its selectors and compose flow to the actual platform. |
| LINE | `curl -X POST https://api.line.me/v2/bot/message/broadcast -H "Authorization: Bearer {line_channel_access_token}" -H "Content-Type: application/json" -d '{"messages":[...]}'` (token from `config.json`) → then Playwright headless open LINE OA Manager chat to screenshot the sent message |
| LinkedIn | Playwright headless → LinkedIn: open recipient profile → Message → send DM → screenshot sent confirmation |

## Step 5: Q&A Auto-Check

> REQUIRES: Step 4 completed (at least one channel sent successfully)

After sending, offer to start a Q&A monitoring loop that checks for replies every 15 minutes using the `/loop` tool.

**How it works:**

1. Use `/loop 15m` to schedule recurring checks
2. **You MUST check ALL channels every cycle. Do NOT skip any channel.** Verify logged-in account before operating each channel (by email/username/ID, not display name. If wrong → log out, re-login via `playwright-login`):
   - **Email**: `playwright-headless` → navigate to `email_webmail_url` from `config.json` → verify account → search replies to "Weekly Report" subject → read new replies → screenshot
   - **LINE**: `playwright-headless` → navigate to `https://manager.line.biz` → verify account → Chat tab → check new messages → screenshot
3. If session expired or wrong account, switch to `playwright-login` for user to re-login, then back to headless
4. Fallback: Chrome DevTools MCP if Playwright fails
5. Show all screenshots as proof
6. Print summary of new messages found
7. **Always call `browser_close` after each check cycle**

**Do NOT auto-reply to any messages.** Only report new messages to the user. The user decides how to respond.

**The loop continues until the user stops it.** Each cycle is independent — if one channel fails, continue checking others.

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. During init (Step 0), never ask user to choose — just do it. For approval (Step 3) and Q&A offer (Step 5), use `AskUserQuestion` with clickable `options`.
4. ALL init must complete before ANY fetch.
5. Playwright primary, Chrome DevTools MCP fallback. No other browser tools.
6. **Always call `browser_close` when done.** Playwright only allows one session at a time — if not closed, other skills cannot use the browser.
