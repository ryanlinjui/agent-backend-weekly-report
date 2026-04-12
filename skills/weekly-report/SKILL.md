---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Use when user says "weekly report", "週報", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

**All state lives in this skill's folder** (`skills/weekly-report/`): `config.json`, `.browser-session/`, and LINE Bot MCP config in project `.mcp.json`. Never write to global/user-level paths. This enables scheduled tasks — the agent resolves its own folder from this SKILL.md's path.

**First, read `config.json` (same folder as this SKILL.md) to check which services are already configured (skip their init). Then scan the `<system-reminder>` tags in the conversation for the deferred tools list. A service is "not installed" ONLY if zero tools match in that list. NEVER claim a tool is unavailable without checking first.**

### Phase 1: Check GitHub (no browser, no MCP)

Do NOT check or call any MCP tools yet — checking MCP too early may cause the agent to wrongly cache them as unavailable.

| Service | How to check | If not ready |
|---|---|---|
| GitHub | `gh auth status` | `gh auth login --web` |

Slack and Notion are checked later in Step 1 (Fetch) when MCP is fully ready.

### Phase 2: Ask recipients

After Phase 1 services are ready, ask user ONE question:

**「報告要寄給誰？請提供 Email 收件人、LinkedIn 個人檔案網址。」**（LINE 不用問，broadcast 自動寄給所有 followers）

Save to `config.json` as `REPORT_RECIPIENTS`, `LINKEDIN_RECIPIENTS`.

### Phase 3: Browser login (one-time)

Use `playwright-login` to open each service. User logs in manually. Session auto-saved to `.browser-session/` via `--user-data-dir`.

| Service | URL | Done when |
|---|---|---|
| Gmail | `https://mail.google.com` | Inbox loads |
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

Each channel independent — if one fails, try Chrome DevTools MCP as fallback, then continue others.

| Channel | How |
|---|---|
| Email | Playwright headless → Gmail: Compose → fill To / Subject / Body → Send |
| LINE | LINE Bot MCP `broadcast_text_message` (API, no browser needed) |
| LinkedIn | Playwright headless → LinkedIn: open recipient profile → Message → send DM |

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. Never ask user to choose during init — just do it. **NEVER use AskUserQuestion.** Plain text only.
4. ALL init must complete before ANY fetch.
5. Playwright primary, Chrome DevTools MCP fallback. No other browser tools.
