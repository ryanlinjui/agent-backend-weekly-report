---
name: weekly-report
description: Generate and send a weekly report from GitHub, Slack, and Notion. Delivers via Email, LINE, LinkedIn. Includes Q&A auto-check loop. Use when user says "weekly report", "週報", "qa", "check replies", "回覆", or similar.
---

# Weekly Report

Auto-detect user language from OS locale or their message. Use that language for all output.

## Entry modes

Decide which mode based on the user's activation phrase (case- and language-insensitive match against `description` triggers):

| Phrase (examples) | Mode | What to run |
|---|---|---|
| `weekly report`, `週報`, `generate report` | **Full report** | Step 0 → Step 1 → Step 2 → Step 3 → Step 4 → Step 5 (setup offer) |
| `qa`, `check replies`, `回覆` | **QA cycle only** | Step 0 Phase 0 (CLI verify) → Step 5 `QA cycle` section only. **Skip Steps 1–4** — this entry is for scheduled ticks and ad-hoc reply sweeps, not for producing a new report. |

Scheduled `/schedule` tasks always invoke the **QA cycle only** mode (their prompt is one of `qa` / `check replies`). Full-report triggers are expected to be rare (once a week, user-initiated).

## Step 0: Init

**All state lives in this skill's root folder** — `config.json`, the persistent browser profile at `.browser-session/`, and substituted template temp files at `.pw-tmp/`. Never write to global/user-level paths. This enables scheduled tasks — the agent resolves its own folder from this SKILL.md's path, and all browser state travels with the skill.

**Required:** `gh`, `npx`, and `@playwright/cli`. Slack / Notion MCPs are optional — skip data sources whose MCP isn't connected. Phase 0 verifies the required set every run; a missing CLI cascades into confusing downstream failures, so it's worth checking up front.

First, read `config.json` (same folder as this SKILL.md) to check which services are already configured (skip their init).

### Phase 0: Verify CLI tools (every run)

Run this check up front — a missing CLI causes downstream failures with confusing error messages.

For each tool, run the check command; if it fails, tell the user the exact install command for **their OS** (detect via `uname -s` / `$OSTYPE` / `%OS%`), then STOP until they confirm.

| Tool | Check | Install (macOS) | Install (Windows) | Install (Linux) |
|---|---|---|---|---|
| `gh` | `gh --version` | `brew install gh` | `winget install GitHub.cli` | `apt install gh` or see <https://github.com/cli/cli#installation> |
| Node.js / `npx` | `npx --version` | `brew install node` | `winget install OpenJS.NodeJS` | `apt install nodejs npm` / use `nvm` |
| `@playwright/cli` | `playwright-cli --version` | `npm install -g @playwright/cli@latest` | same | same |

After `playwright-cli --version` succeeds, ensure the browser is installed: `playwright-cli install-browser chrome` is idempotent (no-op if already installed). No Claude Desktop config to edit — unlike the old `@playwright/mcp` setup, `playwright-cli` is a direct CLI and doesn't need any entries in `claude_desktop_config.json`. Slack / Notion MCPs (optional) still need their usual MCP config if the user wants those data sources.

Once all three CLIs check out, proceed to Phase 1.

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

The skill uses two `playwright-cli` sessions that share one persistent profile at `.browser-session/` (relative to this SKILL.md's folder):

| Session | Mode | Purpose |
|---|---|---|
| `weekly-report` | headless (default) | All automated sends, QA, identity checks |
| `weekly-report-login` | headed (`--headed`) | Manual login only (visible browser) |

Both are opened with `--persistent --profile=.browser-session` so cookies persist across runs and are shared between modes. Chromium lockfiles at that path mean **only one session may be open at a time** — always `close` the current session before opening the other (Rule 6).

**Session open / close idioms.** Run all `playwright-cli` commands from the skill's root folder so the `--profile` path resolves relative to cwd and `run-code --filename` paths stay inside the sandbox:

```bash
# Headless — everything except manual login
playwright-cli -s=weekly-report open <URL> --persistent --profile=.browser-session

# Headed — only for user-driven login / reCAPTCHA
playwright-cli -s=weekly-report-login open <URL> --headed --persistent --profile=.browser-session

# Close (mandatory before switching modes)
playwright-cli -s=weekly-report close
playwright-cli -s=weekly-report-login close
```

For each service, open the URL in the headless `weekly-report` session first. A previous session may exist but belong to someone else — **do NOT assume it is the user's.**

**For each service:**
1. Open the URL with the `weekly-report` headless session (per the idiom above).
2. If already logged in → read the account identifier (email, username, account ID — **NEVER rely on display name alone**) via a short `run-code` snippet → show to user via `AskUserQuestion` with `options: ["Yes, it's mine", "No, wrong account"]`.
3. If wrong account or not logged in → **log out first if needed** → **`playwright-cli -s=weekly-report close`** (Rule 6: required before switching mode) → switch to `weekly-report-login` (headed) → navigate to the login URL → tell user which site to log in to → **block on `AskUserQuestion` with `options: ["Done, I'm logged in", "Cancel"]`** (do NOT poll the page; the user needs time to complete the flow, and an AskUserQuestion is the clean handoff). After `Done`, re-read the logged-in account identifier to verify it matches expectation, then **`playwright-cli -s=weekly-report-login close`** before any subsequent headless operation.
4. Save verified identity to `config.json`.

| Service | URL | Verify by | Done when |
|---|---|---|---|
| GitHub | — (use `gh` CLI) | `gh api user --jq '.login, .email'` | login and email confirmed |
| Slack | — (use Slack MCP) | authenticated user email | email confirmed |
| Notion | — (use Notion MCP) | `notion-get-users` user email | email confirmed |
| Email | `email_webmail_url` from `config.json` | logged-in email address | matches `email_user` |
| LINE OA Manager | `https://manager.line.biz` | account ID or linked email | confirmed by user |
| LinkedIn | `https://www.linkedin.com` | profile URL or email from account settings | confirmed by user |

See [init-email.md](references/init-email.md) and [init-line.md](references/init-line.md) for details. **For LINE: the agent must obtain the Channel Access Token itself via browser automation from LINE Developers — NEVER ask the user to provide it.**

**Session persists across runs.** Subsequent operations reopen `weekly-report` with the same `.browser-session/` profile — no re-login needed.

**Browser rules:** Only use `@playwright/cli`. Headed session (`weekly-report-login`) for login only. Headless session (`weekly-report`) for everything else. Do NOT use `open` bash, Chrome DevTools MCP, "Claude in Chrome", or anything else to drive a browser.

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
| LinkedIn | `@playwright/cli` | `{linkedin_profile_name}` | `{LINKEDIN_RECIPIENTS}` |

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

Each channel independent. **Before operating on any browser-based channel (Email, LINE, LinkedIn), first open the `weekly-report` session to the service and verify the logged-in account matches the expected identity in `config.json` (by email, username, or account ID — not display name).** Sessions may carry a different account from previous use. If mismatched → log out first, close `weekly-report` (Rule 6), then re-login via `weekly-report-login`, close visible, re-check via headless.

**You MUST use the templates in `scripts/` for Email and LinkedIn — no inline reimplementation, no shortcut versions.** The templates encode quirks that cost real time to discover (Gmail's hidden-textarea body, LinkedIn's stacked bubbles, etc.); reimplementing in-line drops those and sends fail silently. Flow for each scripted channel:

1. `Read` the template file verbatim.
2. `.replace()` each `__PLACEHOLDER__` with `JSON.stringify(value)` — do not inline-edit values another way. (`JSON.stringify` handles quotes, unicode, and newlines safely; `playwright-cli run-code`'s JS context has no `process` or `require`, so args must be baked into the code via substitution.)
3. `Write` the substituted code to `.pw-tmp/<template-name>.js`. The path **must** be under the skill's cwd — `playwright-cli run-code --filename` sandboxes `--filename` to cwd and its `.playwright-cli/` subdir; paths outside those roots are rejected with `File access denied`.
4. Run:
   ```bash
   playwright-cli --raw -s=weekly-report run-code --filename=.pw-tmp/<template-name>.js
   ```
   `--raw` strips the default markdown-ish status output (`### Ran Playwright code` etc.) so stdout is exactly the JSON-serialized return value of the template — e.g. `{"sent":true}`.
5. **Verify the stdout JSON is exactly `{"sent":true}`.** Anything else (missing key, `{"sent":false}`, non-zero exit, error JSON like `### Error\n...`) = FAILED. Do not assume success from "no error" — the templates only return `sent: true` after explicit proof (Gmail "Message sent" toast, LinkedIn compose bubble dismiss, etc.).

On failure:
1. Read the stderr / stdout to diagnose (non-`--raw` output includes a `### Error` block with the stack).
2. If session expired or wrong account → `playwright-cli -s=weekly-report close` → re-login via `weekly-report-login` → close visible → retry.
3. If element not found → retry once with updated selectors (patch the template in memory for this call, then update `scripts/` if the fix is real).
4. If still failing after one retry → mark this channel FAILED in the summary with the specific reason; continue other channels. (No alternative browser tool — `@playwright/cli` is the only path.)

| Channel | How |
|---|---|
| Email | If `email_platform` is `gmail`: for each recipient in `REPORT_RECIPIENTS`, follow the flow above with `scripts/gmail-send.js`, substituting `__TO__` (that single recipient), `__SUBJECT__`, `__BODY__`. One send per recipient — avoids the BCC-broadcast pattern Gmail flags as spam, and naturally hides recipients from each other. For non-gmail platforms only: build an inline `run-code` snippet that navigates to `email_webmail_url` and adapts selectors dynamically. **Headless session only.** See [send-email.md](references/send-email.md). |
| LINE | `curl -X POST https://api.line.me/v2/bot/message/broadcast -H "Authorization: Bearer {line_channel_access_token}" -H "Content-Type: application/json" -d '{"messages":[...]}'`. Success signal: HTTP 200 with empty `{}` body. Non-200 or error body = FAILED. |
| LinkedIn | For each recipient: follow the flow above with `scripts/linkedin-dm.js`, substituting `__PROFILE_URL__` and `__MESSAGE__`. **Headless session only.** See [send-linkedin.md](references/send-linkedin.md). |

**After the loop, report every recipient explicitly** in a table (not prose): `channel | recipient | status (sent / FAILED) | evidence (the specific return value or error)`. **Do not claim `sent` without the concrete `{"sent":true}` or HTTP 200 in the evidence column** — anything vague means it didn't actually happen.

## Step 5: Q&A Auto-Check

> REQUIRES: Step 4 completed (at least one channel sent successfully)

After sending, **offer** the user a scheduled QA loop via **Claude Desktop's built-in `/schedule` (local task)** — the skill is used as a scheduled task so it can keep replying even when the user isn't at the computer. `/loop` works for an interactive ad-hoc check, but scheduled automation must go through `/schedule`.

### Scheduling the QA task (runs at the end of each full-report flow)

The schedule is installed by delegating to Claude Desktop's built-in **`schedule` skill**, which persists the task as a file at `~/.claude/scheduled-tasks/<task-name>/SKILL.md`. This file is **filesystem-backed**, not session-backed — it survives restarts, Claude Desktop upgrades, and individual conversation lifetimes, and it has **no 7-day auto-expire**. Do NOT use `CronCreate` here: that tool only lives inside the current Claude session (even with `durable: true` it still needs Claude running, and recurring jobs auto-expire after 7 days). We want the file-on-disk variety.

This section runs **only on full-report invocations**. Scheduled QA ticks skip straight to the `QA cycle` section below.

**Step 5.1 — Skip if already scheduled.**

Check `config.json` for `qa_schedule_configured: true`. If set, print a one-liner (e.g. `QA already scheduled as ~/.claude/scheduled-tasks/weekly-report-qa/SKILL.md. Manage it via /schedule.`) and return. This prevents duplicate installs when the user runs `/weekly-report` each week.

**Step 5.2 — Ask the user once.** `AskUserQuestion` with `options: ["Yes, set up QA schedule", "Skip"]`. On `Skip`: write `qa_schedule_configured: false` and end.

**Step 5.3 — Install via the `schedule` skill.** On `Yes`, invoke the `schedule` skill with the `Skill` tool. **The `permission mode: bypass` clause is mandatory — it MUST be in the args string.** Without bypass, every browser tool call during a scheduled tick will wait on an approval prompt, no one is there to click Approve, and the entire QA cycle stalls. Lead the args with it so it can't be missed:

```
Skill({
  skill: "schedule",
  args: "Create a persistent local task named 'weekly-report-qa'. Permission mode: bypass (REQUIRED — do NOT use default / plan / any other mode; the task must run unattended without approval prompts). Schedule: every 15 minutes. Prompt: \"qa\"."
})
```

The `schedule` skill (ships with Claude Desktop as `anthropic-skills:schedule`) wraps `mcp__scheduled-tasks__create_scheduled_task` and writes the SKILL.md task file at `~/.claude/scheduled-tasks/weekly-report-qa/SKILL.md`. It returns the task file path on success.

**Step 5.3a — Verify bypass actually stuck.** Read the created task file (`~/.claude/scheduled-tasks/weekly-report-qa/SKILL.md`). Confirm it contains `permission: bypass` (or equivalent — the exact frontmatter key may be `permission_mode` / `permissionMode` depending on the version). If the file does NOT include bypass:
- Edit the task file's frontmatter to add `permission: bypass`.
- Re-read to confirm.
- If editing fails, delete the task and retry Step 5.3 with a louder-worded args string, or fall through to the manual fallback (Step 5.3b).

Only after bypass is verified, write to `config.json` (preserve all other keys):

```json
{
  "qa_schedule_configured": true,
  "qa_schedule_interval": "15m",
  "qa_schedule_task_name": "weekly-report-qa",
  "qa_schedule_task_file": "<path returned by schedule skill>"
}
```

Then show a final one-liner (`QA scheduled every 15m (bypass mode, persistent). Manage / delete via /schedule or by removing the task file.`) and finish.

**Step 5.3b — If `schedule` skill isn't available** (e.g. older Claude Desktop, skill disabled), fall back to a guided manual setup:

- In a **new conversation**, type `/schedule` → **+ New task** → **New local task** (NOT remote — the task needs local `playwright-cli` + Bash access and this skill's folder).
- **Interval** — `15m` (adjust to what the user asked for).
- **Prompt** — one of `"qa"` / `"check replies"` / `"回覆"` (these hit the QA-cycle-only entry mode).
- **Permission mode → `bypass`** — **mandatory.** In any other mode each tool call prompts for approval and the scheduled tick silently stalls.
- `AskUserQuestion` with `options: ["Done, task created", "Cancel"]`. On `Done`: write `qa_schedule_configured: true` to `config.json`.

### QA cycle (runs per scheduled tick)

**QA covers Email and LINE only — LinkedIn is intentionally excluded.** You MUST run the check scripts for both channels every cycle, then reply via the reply scripts. Scripts are mandatory (Rule 7); the reply templates return `{"sent":true}` only after the platform confirms delivery (Rule 8). Verify logged-in account before operating each channel (check by email/username/ID, not display name):

Each script goes through the same Read → substitute → Write to `.pw-tmp/` → `playwright-cli --raw -s=weekly-report run-code --filename=...` flow described in Step 4.

- **Email (Gmail)**:
  a. Run `scripts/gmail-qa-check.js` — substitute `__SUBJECT_FILTER__` (e.g. `"Weekly Report"`) and `__NEWER_THAN__` (e.g. `"1d"` for daily cadence, `"30m"` for 15-minute cadence with buffer). Stdout JSON: `{"threads":[{"threadId","threadUrl","from","subject","bodyPreview"},...]}`.
  b. For each thread that needs a response (use the report's raw data to ground the reply — never fabricate), run `scripts/gmail-qa-reply.js` with `__THREAD_URL__` from step a and the generated `__BODY__`. Verify stdout is exactly `{"sent":true}`.
  c. Non-gmail platforms: fall back to an inline `run-code` snippet that adapts selectors on `email_webmail_url`.

- **LINE OA**:
  a. Run `scripts/line-qa-check.js` with `__ACCOUNT_ID__` from `config.json`. Stdout: `{"oaUserId","chats":[{"userName","lastMessage","timestamp","chatUrl"},...]}`.
  b. For each chat whose `lastMessage` is newer than the previous tick's timestamp (persist the high-water mark in `config.json` across runs), run `scripts/line-qa-reply.js` with `__CHAT_URL__` and generated `__BODY__`. Verify stdout is exactly `{"sent":true}`.
  c. **Mandatory — do NOT skip LINE even if Email had no replies.**

### Per-cycle housekeeping

- If session expired or wrong account → `playwright-cli -s=weekly-report close` (Rule 6) → switch to `weekly-report-login` for the user to re-login → close visible → resume headless. Under `bypass` permission mode there's nobody to click AskUserQuestion, so if a manual login is truly needed the cycle should exit with a clear log and let the next tick retry (the session often self-heals via silent SSO).
- Print summary of questions answered (even if zero) so the scheduled run log is useful.
- **Always close the session at the end of the cycle** (Rule 6 — releases the `.browser-session/` lock for the next tick): `playwright-cli -s=weekly-report close`.

**Reply rules:** Every answer must trace to the report's raw data. Never fabricate.

**The `/schedule` task keeps ticking until the user deletes it** from the `/schedule` panel. Each tick is independent — if one channel fails, continue checking the other.

## Rules

1. Never send without approval.
2. Never fabricate — raw data only.
3. During init (Step 0), never ask for pure preferences — just do it. Use `AskUserQuestion` only when you need to block on user action: confirming an account identity after a session check, or the login handoff after opening a visible browser (`options: ["Done, I'm logged in", "Cancel"]`). For approval (Step 3), show a numbered plain-text menu — **not** `AskUserQuestion` — so its modal doesn't hide the draft. For Q&A offer (Step 5), use `AskUserQuestion` with clickable `options`.
4. ALL init must complete before ANY fetch.
5. **`@playwright/cli` is the only browser tool. No MCP browser tools. No Chrome DevTools. No `open` bash. No Claude-in-Chrome.** Use the `weekly-report-login` (headed) session only when real user interaction is required — manual login, captcha solving, OA creation form review. Everything else (send email / LINE OA setup / LinkedIn DM / QA chat checks / session verification / Messaging API toggles / token retrieval) runs on the `weekly-report` (headless) session. If the headless session reports the user isn't logged in, hand off to the headed session for that one login, then switch back.
6. **`playwright-cli -s=<session> close` before every mode switch — hard rule.** Both sessions point at the same `--profile=.browser-session` directory; Chromium writes a lockfile (`SingletonLock` / `SingletonCookie` / `SingletonSocket`) there and crashes / corrupts the profile if two processes fight over it. Discipline:
   - About to `open` the `weekly-report-login` session → first run `playwright-cli -s=weekly-report close` (no-op if it wasn't open).
   - About to `open` the `weekly-report` session → first run `playwright-cli -s=weekly-report-login close`.
   - Always close the session you just used before the step ends.
   - **Recovery from a stale lockfile** (crash / interrupted run): `rm -f ".browser-session/SingletonLock" ".browser-session/SingletonCookie" ".browser-session/SingletonSocket"`, then retry. `playwright-cli kill-all` additionally force-terminates any zombie CLI daemons holding the lock — useful when `close` reports success but the next `open` still sees a stale lockfile.
7. **Every template in `scripts/` is mandatory where it applies — no inline reimplementation.** The full inventory:

   | Script | Step | Use for |
   |---|---|---|
   | `scripts/gmail-send.js` | Step 4 | Sending the weekly report per Gmail recipient |
   | `scripts/gmail-qa-check.js` | Step 5 | Listing unread Gmail replies to reply to |
   | `scripts/gmail-qa-reply.js` | Step 5 | Replying to a Gmail thread by URL |
   | `scripts/linkedin-dm.js` | Step 4 | Sending a LinkedIn DM per recipient |
   | `scripts/line-create-oa-fill.js` | Step 0 Phase 3 | Filling the LINE OA creation form |
   | `scripts/line-init.js` | Step 0 Phase 3 | Post-creation: TOS agree / enable Messaging API / Response settings / Channel Access Token |
   | `scripts/line-qa-check.js` | Step 5 | Listing LINE OA chats for reply candidates |
   | `scripts/line-qa-reply.js` | Step 5 | Replying to a LINE chat by URL |

   Flow for each: `Read` the template, substitute placeholders with `JSON.stringify(value)`, `Write` to `.pw-tmp/<template-name>.js`, then:
   ```bash
   playwright-cli --raw -s=weekly-report run-code --filename=.pw-tmp/<template-name>.js
   ```
   Use `-s=weekly-report-login` instead only for `line-create-oa-fill.js`, where reCAPTCHA may throw a visible challenge the user needs to solve. Do not hand-write the compose / reply / form-fill flow — you will miss the quirks the templates encode (hidden textarea labeled "Message Body", compose-bubble stacking, bidi marks in Send label, Gmail's multi-dialog scoping, LINE's separate session SSO handshake, etc.) and the operation will fail silently. If a template is wrong for the current UI, patch it in `scripts/` and use the patched version — do not bypass.

   Not scripted (intentional): login flows (inherently user-visible, covered by `weekly-report-login` + `AskUserQuestion`), LINE broadcast in Step 4 (plain `curl` to the Messaging API, no browser needed), and account-identity verification (a single inline `run-code` call — too small to template).
8. **Never claim `sent` without the explicit success signal.** The templates return `{"sent":true}` only after verifying the platform's own confirmation (Gmail "Message sent" toast, LinkedIn compose close, LINE API HTTP 200). If the `--raw` stdout isn't exactly `{"sent":true}` (or for LINE API: HTTP 200 with `{}` body), the send did **not** happen — report FAILED with the actual return / error. "No error was thrown" ≠ sent. The Step 4 final summary table must quote the concrete evidence (the stdout JSON or status code) per recipient.
