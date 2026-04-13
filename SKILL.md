---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Includes Q&A auto-check loop. Use when user says "weekly report", "週報", "qa", "check replies", "回覆", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Pre-flight

**Skip this step if running from `/loop` (scheduled/recurring execution).** Only applies to interactive (user-initiated) runs.

Before doing anything else, output a message asking the user if they're ready to start (e.g. "Ready to start? Type anything to continue."). Do NOT use `AskUserQuestion` — the user must reply in the chat input box to trigger a second conversation iteration. This ensures MCP tools (Slack, Notion, etc.) are fully loaded before any work begins.

**Do NOT call any tool or run any command until the user replies.**

## Step 0: Init

**All state lives in this skill's root folder**: `config.json`. Never write to global/user-level paths. This enables scheduled tasks — the agent resolves its own folder from this SKILL.md's path.

**OpenCLI must be installed and the Browser Bridge extension must be running in Chrome.** All browser automation uses `opencli browser` commands via Bash. OpenCLI reuses Chrome's existing login sessions — no separate browser session storage needed.

**Slack, Notion MCP tools are pre-configured via manifest. NEVER check if they're installed. NEVER try to install them. NEVER call any MCP tool until Step 1. Just trust they exist and use them when needed.**

First, read `config.json` (same folder as this SKILL.md) to check which services are already configured (skip their init).

### Phase 1: Check GitHub and OpenCLI

**ONLY run CLI checks. Do NOT call ANY MCP tool (Slack, Notion, or anything else). MCP tools are pre-installed — calling them too early causes false "unavailable" errors.**

| Service | How to check | If not ready |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |
| OpenCLI | `opencli doctor` | Tell user: install via `npm install -g @jackwener/opencli` and install the Browser Bridge extension in Chrome |

### Phase 2: Ask recipients

After Phase 1 services are ready:

**Ask one question at a time. Wait for each answer before asking the next.**

1. Auto-detect sender email: run `gh api user --jq '.email'`. If available, show it and ask "Is this correct?" via `AskUserQuestion` with `options: ["Yes", "No"]`. If "No" or unavailable, ask user to type their email. Save as `email_user` to `config.json`.
2. Ask which email platform or webmail the user uses to send/read email (e.g. Gmail, Outlook, Yahoo, custom webmail, etc.). If the platform can be inferred from the email domain (e.g. `@gmail.com` → Gmail), confirm with the user. Otherwise ask them to provide the webmail URL. Save as `email_platform` (e.g. `"gmail"`, `"outlook"`, `"yahoo"`, `"custom"`) and `email_webmail_url` (e.g. `"https://mail.google.com"`) to `config.json`.
3. Ask who to send the report to — Email recipients. Save as `REPORT_RECIPIENTS` to `config.json`.
4. Ask for LinkedIn profile URLs of recipients. Save as `LINKEDIN_RECIPIENTS` to `config.json`. (LINE uses broadcast to all followers — no need to ask.)

### Phase 3: Browser login & verify accounts

**Login only — NEVER create new accounts on any platform.**

**OpenCLI reuses Chrome's existing login sessions via the Browser Bridge extension.** If the user is already logged in to a service in Chrome, OpenCLI can access that session automatically.

**For each service:**
1. Run `opencli browser open <url>` to open the page
2. Run `opencli browser state` to inspect page content
3. Check if logged in by reading the page structure
4. If logged in → read the account identifier (email, username, account ID — **NEVER rely on display name alone**) → show to user via `AskUserQuestion` with `options: ["Yes, it's mine", "No, wrong account"]`
5. If wrong account or not logged in → tell user to log in (or switch account) in their Chrome browser, then confirm when done → re-check with `opencli browser open` + `opencli browser state`
6. Save verified identity to `config.json`
7. Run `opencli browser close` before moving to next service

| Service | URL | Verify by | Done when |
|---|---|---|---|
| GitHub | — (use `gh` CLI) | `gh api user --jq '.login, .email'` | login and email confirmed |
| Slack | — (use Slack MCP) | authenticated user email | email confirmed |
| Notion | — (use Notion MCP) | `notion-get-users` user email | email confirmed |
| Email | `email_webmail_url` from `config.json` | logged-in email address | matches `email_user` |
| LINE OA Manager | `https://manager.line.biz` | account ID or linked email | confirmed by user |
| LinkedIn | `https://www.linkedin.com` | profile URL or email from account settings | confirmed by user |

See [init-email.md](references/init-email.md) and [init-line.md](references/init-line.md) for details. **For LINE: the agent must obtain the Channel Access Token itself via browser automation from LINE Developers — NEVER ask the user to provide it.**

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
| LinkedIn | OpenCLI | `{linkedin_profile_name}` | `{LINKEDIN_RECIPIENTS}` |

**STOP — If ANY service above is not configured, do NOT proceed past this point. Complete all phases of Step 0 first.**

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

Each channel independent. **Before operating on any browser-based channel (Email, LINE, LinkedIn), first run `opencli browser open <url>` + `opencli browser state` and verify the logged-in account matches the expected identity in `config.json` (by email, username, or account ID — not display name).** Sessions may carry a different account from previous use. If mismatched → tell user to switch account in Chrome, then re-verify.

On failure:
1. Read the error message to diagnose the cause
2. If session expired or wrong account → ask user to re-login in Chrome, then retry
3. If element not found → run `opencli browser screenshot` to capture state, run `opencli browser state` to re-inspect, retry once
4. If still failing → report what failed and why in plain language, continue other channels

**After each successful send, run `opencli browser screenshot` as proof and show it to the user.**

| Channel | How |
|---|---|
| Email | Read `email_platform` and `email_webmail_url` from `config.json` → `opencli browser open <webmail_url>` → `opencli browser state` to inspect page → navigate Compose flow using `opencli browser click`, `opencli browser type`, `opencli browser keys` → fill To / Subject / Body → Send → `opencli browser screenshot` sent confirmation. Agent reads `state` output to find correct element indices for each action. |
| LINE | `curl -X POST https://api.line.me/v2/bot/message/broadcast -H "Authorization: Bearer {line_channel_access_token}" -H "Content-Type: application/json" -d '{"messages":[...]}'` (token from `config.json`) → then `opencli browser open` LINE OA Manager chat → `opencli browser screenshot` the sent message |
| LinkedIn | `opencli browser open` LinkedIn → `opencli browser state` → navigate to recipient profile → Message → send DM using `opencli browser click`, `opencli browser type`, `opencli browser keys` → `opencli browser screenshot` sent confirmation |

**After all channels done, run `opencli browser close`.**

## Step 5: Q&A Auto-Check

> REQUIRES: Step 4 completed (at least one channel sent successfully)

After sending, offer to start a Q&A monitoring loop that checks for replies every 15 minutes using the `/loop` tool.

**How it works:**

1. Use `/loop 15m` to schedule recurring checks
2. **You MUST check ALL channels every cycle. Do NOT skip any channel.** Verify logged-in account before operating each channel (check by email/username/ID, not display name. If wrong → ask user to switch account in Chrome):
   - **Email**: `opencli browser open <email_webmail_url>` → `opencli browser state` → verify account → search replies to "Weekly Report" subject → read new replies → compose and send response using `opencli browser click`, `opencli browser type`, `opencli browser keys` → `opencli browser screenshot`. Agent reads `state` to adapt to the actual platform.
   - **LINE**: `opencli browser open https://manager.line.biz` → `opencli browser state` → verify account → navigate to Chat tab → check for new messages → reply directly in chat → `opencli browser screenshot`. **This is mandatory — do NOT skip LINE even if Email had no replies.**
3. If session expired or wrong account, ask user to re-login in Chrome, then retry
4. Show all screenshots as proof
5. Print summary of questions answered
6. **Always run `opencli browser close` after each check cycle**

**Reply rules:** Every answer must trace to the report's raw data. Never fabricate.

**The loop continues until the user stops it.** Each cycle is independent — if one channel fails, continue checking others.

## OpenCLI Browser Command Reference

Quick reference for browser automation commands used in this skill:

```bash
# Navigation
opencli browser open <url>           # Open URL
opencli browser close                # Close automation window

# Page inspection
opencli browser state                # Get page structure with [N] element indices
opencli browser screenshot [path]    # Screenshot (file path or base64 to stdout)
opencli browser get url              # Current URL
opencli browser get text <N>         # Element text by index

# Interaction
opencli browser click <N>            # Click element by [N] index
opencli browser type <N> "text"      # Type into element by [N] index
opencli browser keys "Enter"         # Press keyboard key
opencli browser select <N> "option"  # Select dropdown option

# Wait
opencli browser wait text "Success"  # Wait until text appears
opencli browser wait selector ".cls" # Wait until CSS selector matches
opencli browser wait time 3          # Fixed delay (seconds)
```

**Workflow pattern:** Always run `state` first to discover element indices, then use those `[N]` numbers with `click`, `type`, `select`, etc.

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. During init (Step 0), never ask user to choose — just do it. For approval (Step 3) and Q&A offer (Step 5), use `AskUserQuestion` with clickable `options`.
4. ALL init must complete before ANY fetch.
5. All browser automation via `opencli browser` commands through Bash. No other browser tools.
6. **Always run `opencli browser close` when done.** OpenCLI uses Chrome's automation window — close it to avoid conflicts.
