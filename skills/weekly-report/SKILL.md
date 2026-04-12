---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Use when user says "weekly report", "週報", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

**All state lives in this skill's folder** (`skills/weekly-report/`): `config.json`, `.browser-session/`, and LINE Bot MCP config in project `.mcp.json`. Never write to global/user-level paths. This enables scheduled tasks — the agent resolves its own folder from this SKILL.md's path.

**Playwright, Slack, Notion are ALL pre-configured in `.mcp.json`. NEVER check if they're installed. NEVER try to install them. NEVER call any MCP tool until Step 1. Just trust they exist and use them when needed.**

First, read `config.json` (same folder as this SKILL.md) to check which services are already configured (skip their init).

### Phase 1: Check GitHub ONLY

**ONLY run `gh auth status`. Do NOT call ANY MCP tool (Playwright, Slack, Notion, or anything else). MCP tools are pre-installed — calling them too early causes false "unavailable" errors.**

| Service | How to check | If not ready |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |

### Phase 2: Ask recipients

After Phase 1 services are ready, ask user ONE question:

Ask (in detected language): who to send the report to? Provide Email recipients and LinkedIn profile URLs. (LINE uses broadcast to all followers — no need to ask.)

Save to `config.json` as `REPORT_RECIPIENTS`, `LINKEDIN_RECIPIENTS`.

### Phase 3: Browser login (one-time)

Use `playwright-login` to open each service. User logs in manually. Session auto-saved to `.browser-session/` via `--user-data-dir`.

| Service | URL | Done when |
|---|---|---|
| Email | User's email provider webmail (e.g. Gmail, Outlook, Yahoo) | Inbox loads |
| LINE OA Manager | `https://manager.line.biz` | Dashboard loads |
| LinkedIn | `https://www.linkedin.com` | Feed loads (or use LinkedIn MCP if available) |

See [init-email.md](references/init-email.md) and [init-line.md](references/init-line.md) for details.

**Session persists across runs.** Subsequent operations use `playwright-headless` with the same `.browser-session/` — no re-login needed.

**Browser rules:** Only use Playwright. Visible browser for login only. Headless for everything else. Fallback: Chrome DevTools MCP if Playwright fails. Do NOT use `open` bash or anything else.

**ALL init must complete before Step 1.**

## Step 1: Fetch

Compute window (`REPORT_WINDOW_DAYS` days back). Fetch from GitHub (`gh` CLI), Slack (MCP), Notion (MCP). Keep raw data.

## Step 2: Draft

Follow [references/report-template.md](references/report-template.md). Every item must trace to raw data. Never fabricate.

## Step 3: Approval

Show draft + recipients. User picks: `1` send / `2` edit / `3` regenerate / `4` cancel. **Never auto-send.**

## Step 4: Send

Each channel independent — if one fails, try Chrome DevTools MCP as fallback, then continue others. **After each successful send, take a screenshot as proof and show it to the user.**

| Channel | How |
|---|---|
| Email | Playwright headless → open email webmail → Compose → fill To / Subject / Body → Send → screenshot sent confirmation |
| LINE | LINE Bot MCP `broadcast_text_message` → then Playwright headless open LINE OA Manager chat to screenshot the sent message |
| LinkedIn | Playwright headless → LinkedIn: open recipient profile → Message → send DM → screenshot sent confirmation |

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. Never ask user to choose during init — just do it. **NEVER use AskUserQuestion.** Plain text only.
4. ALL init must complete before ANY fetch.
5. Playwright primary, Chrome DevTools MCP fallback. No other browser tools.
6. **Always call `browser_close` when done.** Playwright only allows one session at a time — if not closed, other skills cannot use the browser.
