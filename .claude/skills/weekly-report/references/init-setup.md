# Init & Health Check

Auto-check all services, auto-install missing MCPs, and fix broken services on every run.

## MCP tool selection

| Purpose | MCP to use | Why |
|---|---|---|
| Email init (Google login page) | **Playwright MCP** | Google blocks Chrome DevTools on login pages |
| Other browser ops (post-login) | **Chrome DevTools MCP** | Faster, connects to existing Chrome |
| Slack | **Slack MCP plugin** | Native API, no browser |
| Notion | **Notion MCP plugin** | Native API, no browser |
| LINE send | **LINE Bot MCP** | Native API, no browser |
| GitHub | **`gh` CLI** | Already authenticated |

## Required config (.env)

| Variable | Purpose | How to verify |
|---|---|---|
| `GITHUB_USERNAME` | GitHub user to query | `gh auth status` returns OK |
| `REPORT_RECIPIENTS` | Email addresses | Non-empty |
| `REPORT_WINDOW_DAYS` | Days to look back (default: 7) | Non-empty |
| `EMAIL_USER` | Email account (any provider) | Non-empty |
| `EMAIL_PASSWORD` | App Password for IMAP/SMTP | SMTP test succeeds |

## 0a: Auto-install missing MCPs FIRST

Before health check, verify all required MCPs are installed. **If any are missing, install them automatically and continue.** Do NOT ask the user — just install and proceed.

### Check + auto-install each MCP

**Playwright MCP** (needed for email init):
- Check: are `mcp__plugin_playwright_playwright__*` tools available?
- If missing: `claude mcp add-json playwright '{"type":"stdio","command":"npx","args":["-y","@playwright/mcp@latest"]}'`
- Then reconnect via the tool system

**Chrome DevTools MCP** (needed for post-login browser ops):
- Check: are `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` tools available?
- If missing: run `/plugin` install, or `claude mcp add-json chrome-devtools '{"type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"]}'`

**Slack MCP** (plugin):
- Check: are `mcp__plugin_slack_slack__*` tools available?
- If missing: tell user `⚠️ Run /mcp → connect Slack plugin, then say "ok".` → wait

**Notion MCP** (plugin):
- Check: are `mcp__plugin_Notion_notion__*` tools available?
- If missing: tell user `⚠️ Run /mcp → connect Notion plugin, then say "ok".` → wait

**LINE Bot MCP**:
- Check: are `mcp__line-bot__*` tools available?
- If missing: auto-install:
```bash
claude mcp add-json line-bot '{"type":"stdio","command":"/Users/ryanlinjui/.nvm/versions/node/v24.14.0/bin/line-bot-mcp-server","args":[],"env":{"CHANNEL_ACCESS_TOKEN":"<read from .env>"}}'
```
- For Claude Desktop, merge into `~/Library/Application Support/Claude/claude_desktop_config.json`

**GitHub**:
- Check: `gh auth status`
- If fail: run `gh auth login --web` (auto-opens browser)

After installing any MCP, verify it's connected before continuing.

## 0b: Health check

Run all checks. Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Service health check
  GitHub:  ✅ / ❌
  Email:   ✅ / ❌
  Slack:   ✅ / ❌
  Notion:  ✅ / ❌
  LINE:    ✅ / ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Email test:
```bash
python3 .claude/skills/weekly-report/scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "test" --body-file /dev/null
```

**If ANY service is ❌, DO NOT proceed. Fix it immediately:**
- Email ❌ → run Step 0c
- MCP ❌ → re-run Step 0a (auto-install)
- GitHub ❌ → `gh auth login --web`
- LINE webhook ❌ → start webhook server + tunnel

**Loop until ALL ✅. Never skip.**

## 0c: Email App Password setup (Playwright only)

**Use Playwright MCP for this entire flow.** Google blocks Chrome DevTools on login pages.

### Core principle

**Skill drives the browser at ALL times.** Only pause for: password input, phone SMS, CAPTCHA. Never print instructions for things the skill can click itself.

**Login page = hands off (user types). Post-login = skill drives.**

### Step 1: Open login page via Playwright

```
Playwright MCP: browser_navigate → https://myaccount.google.com/apppasswords
```

This redirects to login if needed. User logs in + 2FA in the Playwright browser.

Print:
```
🌐 Login page opened.
   Please log in and complete any verification, then say "ok".
```

**Wait for "ok".**

### Step 2: Confirm login + check page

`browser_snapshot` to verify. If on App Passwords page → skip to Step 4. If on 2FA setup page → Step 3. If still on login → ask user to retry.

### Step 3: Enable 2FA (if needed)

Skill auto-drives:
```
Playwright: browser_navigate → https://myaccount.google.com/signinoptions/two-step-verification
Playwright: browser_snapshot → check status
```

- 2FA ON → Step 4
- 2FA OFF → skill clicks "Turn on" / navigates to phone setup
  - Phone number input → **STOP**: `📱 Enter phone number and verify, then say "ok".` → wait
  - After verify → skill clicks "Turn on 2-Step Verification" → confirm ON

### Step 4: Create App Password (fully automated)

```
Playwright: browser_navigate → https://myaccount.google.com/apppasswords
Playwright: browser_snapshot
Playwright: browser_type → "weekly-report" in App name field
Playwright: browser_click → Create button
Playwright: browser_snapshot → read the 16-character password from the page
```

**No user interaction.** Skill reads the password directly.

### Step 5: Save + verify

Save App Password to `.env` as `EMAIL_PASSWORD`.

Test:
```bash
python3 .claude/skills/weekly-report/scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "Weekly Report — email test" \
  --body-file <(echo "Email configured successfully.")
```

If OK → `✅ Email configured.`
If fail → retry from Step 4.

### When to pause vs. auto-drive

| Page | Skill does | Ask user? |
|---|---|---|
| **Login page** | **NOTHING** | ✅ User does ALL login |
| 2FA settings (post-login) | Click buttons, navigate | ❌ |
| 2FA phone setup | — | ✅ User enters phone + verifies |
| App Password page | Fill name, click Create, read result | ❌ |
| App Password displayed | Read + save to .env | ❌ |

## 0d: LINE webhook (for inbound Q&A)

Fully automated — no user action:
```bash
python3 .claude/skills/weekly-report/scripts/line-webhook.py &
bash .claude/skills/weekly-report/scripts/tunnel.sh 8765
# Set webhook URL via LINE API
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "{TUNNEL_URL}"}'
```

## 0e: Final verify (loop)

Re-run health check. If all ✅ → return to pipeline. If any ❌ → fix → re-check. Loop until all pass.

**Hard gate. Pipeline MUST NOT start with any ❌.**

## User interaction

User only interacts for:
1. **Login** — email password + phone 2FA on Playwright browser (once)
2. **MCP connect** — Slack/Notion plugins if not auto-installable (once)
3. **Approving the report** — review draft → send

Everything else (MCP installation, 2FA setup, App Password creation, webhook, token saving) is automated.
