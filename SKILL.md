---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Includes Q&A auto-check loop. Use when user says "weekly report", "週報", "qa", "check replies", "回覆", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Step 0: Init

**All state lives in this skill's root folder** (e.g. `config.json` plus any browser session data the agent chooses to persist). Never write to global/user-level paths. This enables scheduled tasks — the agent resolves its own folder from this SKILL.md's path.

**Required:** `gh`, `npx`, and the Playwright MCP. Slack / Notion / Chrome DevTools MCPs are optional — skip data sources whose MCP isn't connected, and fall back to Chrome DevTools only if it's available. Phase 0 verifies the required set every run; a silent Playwright misconfig in Claude Desktop cascades into downstream failures, so it's worth checking up front.

First, read `config.json` (same folder as this SKILL.md) to check which services are already configured (skip their init).

### Phase 0: Verify CLI + Playwright MCP config (every run)

Run this check up front — a missing CLI or a misconfigured `claude_desktop_config.json` causes silent failures later (tool calls hang or time out with no useful error).

**Step 0a — CLI tools.** For each, run the check command; if it fails, tell the user the exact install command for **their OS** (detect via `uname -s` / `$OSTYPE` / `%OS%`), then STOP until they confirm.

| Tool | Check | Install (macOS) | Install (Windows) | Install (Linux) |
|---|---|---|---|---|
| `gh` | `gh --version` | `brew install gh` | `winget install GitHub.cli` | `apt install gh` or see <https://github.com/cli/cli#installation> |
| Node.js / `npx` | `npx --version` | `brew install node` | `winget install OpenJS.NodeJS` | `apt install nodejs npm` / use `nvm` |
| `@playwright/mcp` cache | `npx -y @playwright/mcp --version` (auto-installs first run) | — | — | — |

**Step 0b — Claude Desktop MCP config.**

1. Read the Claude Desktop MCP config:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Verify **both** `mcpServers.playwright-login` and `mcpServers.playwright-headless` are present, each with:
   - `command` → **absolute path** to `npx` (macOS / Linux: `which npx`; Windows cmd: `where npx`; PowerShell: `Get-Command npx` — on Windows the executable is `npx.cmd`, not bare `npx`). Bare `"npx"` fails because Claude Desktop launches without a login shell PATH.
   - `args` starting with `["-y", "@playwright/mcp", ...]`. **Never use `@playwright/mcp@latest`** — Claude Desktop has a lazy-loading race where resolving `@latest` on first call hangs and leaves the server half-initialized. Pin to the bare package name.
   - **Same** `--user-data-dir` absolute path on both entries — this is what lets the login session from the visible server be reused by the headless server. If the paths diverge, every headless operation starts with no cookies and silently fails.
   - `playwright-headless` additionally carries `--headless` in its args.

   Expected shape (macOS / Linux example — Windows users substitute `C:\\Users\\<you>\\AppData\\Roaming\\npm\\npx.cmd` for `command` and backslash-escaped Windows paths for `--user-data-dir`):
   ```json
   "mcpServers": {
     "playwright-login": {
       "command": "/Users/<you>/.nvm/versions/node/<ver>/bin/npx",
       "args": [
         "-y", "@playwright/mcp",
         "--user-data-dir", "/Users/<you>/Library/Application Support/Claude/playwright-session"
       ]
     },
     "playwright-headless": {
       "command": "/Users/<you>/.nvm/versions/node/<ver>/bin/npx",
       "args": [
         "-y", "@playwright/mcp",
         "--headless",
         "--user-data-dir", "/Users/<you>/Library/Application Support/Claude/playwright-session"
       ]
     }
   }
   ```

3. If either entry is missing, uses bare `npx`, uses `@latest`, or the two `--user-data-dir` paths disagree → **STOP and walk the user through fix**:
   a. Pre-cache the package: `npx -y @playwright/mcp --version`
   b. Find the absolute npx path: `which npx` (macOS / Linux) / `where npx` (Windows cmd) / `Get-Command npx` (PowerShell)
   c. Edit the config file above so both `playwright-login` and `playwright-headless` exist with matching `--user-data-dir` (keep other entries intact; Windows JSON strings need double-backslash `\\` path separators)
   d. **Fully quit Claude Desktop** — macOS: ⌘Q or menu → Quit; Windows: right-click the tray icon → Exit; Linux: close via tray / system menu. Just closing the window is not enough — the app keeps running in the background.
   e. **Reopen Claude Desktop and start a *new* conversation** — MCP servers are only loaded at conversation start; the existing chat will not pick up config changes
   f. Ask the user to re-invoke the skill

4. If reasonable → proceed to Phase 1.

### Phase 1: Check GitHub

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
3. If wrong account or not logged in → **log out first if needed** → **`browser_close` the headless session** (Rule 6: required before switching mode) → switch to `playwright-login` (visible browser) → tell user which site to log in to → **block on `AskUserQuestion` with `options: ["Done, I'm logged in", "Cancel"]`** (do NOT poll the page; the user needs time to complete the flow, and an AskUserQuestion is the clean handoff). After `Done`, re-read the logged-in account identifier to verify it matches expectation, then **`browser_close` the visible browser** before any subsequent headless operation.
4. Save verified identity to `config.json`

| Service | URL | Verify by | Done when |
|---|---|---|---|
| GitHub | — (use `gh` CLI) | `gh api user --jq '.login, .email'` | login and email confirmed |
| Slack | — (use Slack MCP) | authenticated user email | email confirmed |
| Notion | — (use Notion MCP) | `notion-get-users` user email | email confirmed |
| Email | `email_webmail_url` from `config.json` | logged-in email address | matches `email_user` |
| LINE OA Manager | `https://manager.line.biz` | account ID or linked email | confirmed by user |
| LinkedIn | `https://www.linkedin.com` | profile URL or email from account settings | confirmed by user |

See [init-email.md](references/init-email.md) and [init-line.md](references/init-line.md) for details. **For LINE: the agent must obtain the Channel Access Token itself via browser automation from LINE Developers — NEVER ask the user to provide it.**

**Session persists across runs.** Subsequent operations use `playwright-headless` with the same persisted session — no re-login needed.

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

Show draft + recipients, then render a **prominent numbered menu** in plain text (user needs to see it at a glance — not buried in prose):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  👉 請回覆數字選擇下一步：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  **[1] Send**        — 寄出給所有收件人
  **[2] Edit**        — 我來告訴你要改什麼
  **[3] Regenerate**  — 重抓資料重新產生草稿
  **[4] Cancel**      — 取消這次送出

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Adapt the labels to the user's language (`請回覆數字...` for zh-TW, `Reply with a number...` for English, etc.). Accept either the number or the word as input. **Do NOT use `AskUserQuestion`** — its modal UI blocks the interface and the user cannot see the draft. **Never auto-send.**

## Step 4: Send

> REQUIRES: Step 3 approved (user chose "Send")

Each channel independent. **Before operating on any browser-based channel (Email, LINE, LinkedIn), first navigate with `playwright-headless` and verify the logged-in account matches the expected identity in `config.json` (by email, username, or account ID — not display name).** Sessions may carry a different account from previous use. If mismatched → log out first, `browser_close` headless (Rule 6), then re-login via `playwright-login`, close visible, re-check via headless.

**You MUST use the templates in `scripts/` for Email and LinkedIn — no inline reimplementation, no shortcut versions.** The templates encode quirks that cost real time to discover (Gmail's hidden-textarea body, LinkedIn's stacked bubbles, etc.); reimplementing in-line drops those and sends fail silently. Flow for each scripted channel:

1. `Read` the template file verbatim
2. `.replace()` each `__PLACEHOLDER__` with `JSON.stringify(value)` — do not inline-edit values another way
3. Call `mcp__playwright-headless__browser_run_code` with the substituted code string
4. **Verify the return value is exactly `{ sent: true }`.** Anything else (undefined, `{ sent: false }`, thrown error, empty result) = FAILED. Do not assume success from "no error" — the templates only return `sent: true` after explicit proof (Gmail "Message sent" toast, LinkedIn compose bubble dismiss, etc.).

On failure:
1. Read the error message / partial return to diagnose
2. If session expired or wrong account → `browser_close` headless → re-login via `playwright-login` → close visible → retry
3. If element not found → retry once with updated selectors (patch the template in memory for this call, then update `scripts/` if the fix is real)
4. If still failing → try Chrome DevTools MCP as fallback
5. If all attempts fail → mark this channel FAILED in the summary with the specific reason; continue other channels

| Channel | How |
|---|---|
| Email | If `email_platform` is `gmail`: for each recipient in `REPORT_RECIPIENTS`, follow the flow above with `scripts/gmail-send.js`, substituting `__TO__` (that single recipient), `__SUBJECT__`, `__BODY__`. One send per recipient — avoids the BCC-broadcast pattern Gmail flags as spam, and naturally hides recipients from each other. For non-gmail platforms only: navigate to `email_webmail_url` and adapt selectors dynamically. **Must be headless.** See [send-email.md](references/send-email.md). |
| LINE | `curl -X POST https://api.line.me/v2/bot/message/broadcast -H "Authorization: Bearer {line_channel_access_token}" -H "Content-Type: application/json" -d '{"messages":[...]}'`. Success signal: HTTP 200 with empty `{}` body. Non-200 or error body = FAILED. |
| LinkedIn | For each recipient: follow the flow above with `scripts/linkedin-dm.js`, substituting `__PROFILE_URL__` and `__MESSAGE__`. **Must be headless.** See [send-linkedin.md](references/send-linkedin.md). |

**After the loop, report every recipient explicitly** in a table (not prose): `channel | recipient | status (sent / FAILED) | evidence (the specific return value or error)`. **Do not claim `sent` without the concrete `{ sent: true }` or HTTP 200 in the evidence column** — anything vague means it didn't actually happen.

## Step 5: Q&A Auto-Check

> REQUIRES: Step 4 completed (at least one channel sent successfully)

After sending, offer to start a Q&A monitoring loop that checks for replies every 15 minutes using the `/loop` tool.

**How it works:**

1. Use `/loop 15m` to schedule recurring checks
2. **QA covers Email and LINE only — LinkedIn is intentionally excluded.** You MUST check both Email and LINE every cycle. Do NOT skip either. Verify logged-in account before operating each channel (check by email/username/ID, not display name. If wrong → log out, re-login via `playwright-login`):
   - **Email**: `playwright-headless` → navigate to `email_webmail_url` from `config.json` → verify account → search replies to "Weekly Report" subject → read new replies → compose and send response. Agent adapts to the actual platform.
   - **LINE**: `playwright-headless` → navigate to `https://manager.line.biz` → verify account → go to Chat tab → check for new messages → reply directly in chat. **This is mandatory — do NOT skip LINE even if Email had no replies.**
3. If session expired or wrong account → `browser_close` headless (Rule 6) → switch to `playwright-login` for user to re-login → `browser_close` visible → resume headless
4. Fallback: Chrome DevTools MCP if Playwright fails
5. Print summary of questions answered
6. **Always call `browser_close` after each check cycle**

**Reply rules:** Every answer must trace to the report's raw data. Never fabricate.

**The loop continues until the user stops it.** Each cycle is independent — if one channel fails, continue checking others.

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. During init (Step 0), never ask for pure preferences — just do it. Use `AskUserQuestion` only when you need to block on user action: confirming an account identity after a session check, or the login handoff after opening a visible browser (`options: ["Done, I'm logged in", "Cancel"]`). For approval (Step 3), show a numbered plain-text menu — **not** `AskUserQuestion` — so its modal doesn't hide the draft. For Q&A offer (Step 5), use `AskUserQuestion` with clickable `options`.
4. ALL init must complete before ANY fetch.
5. Playwright primary, Chrome DevTools MCP fallback. No other browser tools. **Use `playwright-login` (visible) only when real user interaction is required — manual login, captcha solving, OA creation form review. Everything else (send email / LINE OA setup / LinkedIn DM / QA chat checks / session verification / Messaging API toggles / token retrieval) runs on `playwright-headless`.** If `playwright-headless` reports the user isn't logged in, hand off to `playwright-login` for that one login, then switch back.
6. **`browser_close` before every mode switch — hard rule.** Both `playwright-login` and `playwright-headless` point at the same `--user-data-dir`; Chromium writes a lockfile (`SingletonLock` / `SingletonCookie` / `SingletonSocket`) there and crashes / corrupts the profile if two processes fight over it. Discipline:
   - About to call a `playwright-login` tool → first call `mcp__playwright-headless__browser_close` (no-op if it wasn't running).
   - About to call a `playwright-headless` tool → first call `mcp__playwright-login__browser_close`.
   - Always `browser_close` the mode you just used before the step ends.
   - **Recovery from a stale lockfile** (crash / interrupted run): `rm -f "<user-data-dir>/SingletonLock" "<user-data-dir>/SingletonCookie" "<user-data-dir>/SingletonSocket"`, then retry. The `--user-data-dir` path is the one configured in `claude_desktop_config.json`.
7. **Send templates in `scripts/` are mandatory — no inline reimplementation.** For Email (Gmail), LinkedIn DM, and LINE OA init: `Read` the template file, substitute placeholders with `JSON.stringify(value)`, call `mcp__playwright-headless__browser_run_code`. Do not hand-write the compose flow in the current turn — you will miss the quirks the template encodes (hidden textarea labeled "Message Body", compose-bubble stacking, bidi marks in Send label, etc.) and the send will fail silently.
8. **Never claim `sent` without the explicit success signal.** The templates return `{ sent: true }` only after verifying the platform's own confirmation (Gmail "Message sent" toast, LinkedIn compose close, LINE API HTTP 200). If the return value isn't exactly `{ sent: true }` (or for LINE API: HTTP 200 with `{}` body), the send did **not** happen — report FAILED with the actual return / error. "No error was thrown" ≠ sent. The Step 4 final summary table must quote the concrete evidence (the return object or status code) per recipient.
