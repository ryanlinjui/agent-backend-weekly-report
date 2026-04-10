# Init & Health Check

Auto-check all services and install missing MCP servers on first run.

## Required config (.env)

| Variable | Purpose | How to verify |
|---|---|---|
| `GITHUB_USERNAME` | GitHub user to query | `gh auth status` returns OK |
| `REPORT_RECIPIENTS` | Email addresses | Non-empty |
| `REPORT_WINDOW_DAYS` | Days to look back (default: 7) | Non-empty |
| `EMAIL_USER` | Email account (any provider) | Non-empty |
| `EMAIL_PASSWORD` | App Password for IMAP/SMTP | SMTP test succeeds |
| `SLACK_USER_TOKEN` | Slack User Token for search | `curl` auth.test returns OK |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API | `curl` bot/info returns OK |

## 0a: Health check

Run all checks in parallel. Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Service health check
  GitHub:  ✅ / ❌ (gh auth status)
  Email:   ✅ / ❌ (SMTP auth test)
  Slack:   ✅ / ❌ (Slack MCP connected)
  Notion:  ✅ / ❌ (Notion MCP connected)
  LINE:    ✅ / ❌ (LINE Bot MCP connected)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

To test email, run:
```bash
python3 .claude/skills/weekly-report/scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "test" --body-file /dev/null
```
If it fails with auth error → EMAIL_PASSWORD needs setup (see 0c).

If everything ✅, return to SKILL.md pipeline.

## 0b: Auto-install missing MCP servers

### Detect environment

- Claude Code: `claude --version` succeeds → use `claude mcp add-json`
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` exists → edit with Write tool

### Install each missing MCP

**LINE Bot MCP** (if `mcp__line-bot__*` tools not available):
```bash
# Claude Code:
claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<read from .env>"}}'
```
For Claude Desktop, merge into `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "line-bot": {
      "command": "npx",
      "args": ["@line/line-bot-mcp-server"],
      "env": {
        "CHANNEL_ACCESS_TOKEN": "<read from .env>"
      }
    }
  }
}
```

**Slack MCP** (plugin): If not connected, print `⚠️ Slack MCP needed.` and auto-open Slack auth:
```bash
# macOS
open "https://slack.com/oauth/v2/authorize"
```
Then tell user: `🌐 Slack auth page opened. Authorize, then run /mcp to connect.`

**Notion MCP** (plugin): If not connected, tell user: `⚠️ Run /mcp → connect Notion plugin, then say "ok".`

**GitHub**: If `gh auth status` fails, auto-start login:
```bash
gh auth login --web
```
This opens the browser automatically. User just clicks authorize.

**LINE Webhook** (for inbound Q&A):
```bash
# Start webhook server
python3 .claude/skills/weekly-report/scripts/line-webhook.py &

# Start tunnel (tries npx localtunnel first, falls back to ssh localhost.run)
bash .claude/skills/weekly-report/scripts/tunnel.sh 8765

# Set webhook URL via LINE API
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "{TUNNEL_URL}"}'
```
This is fully automated — no user action needed.

## 0c: Email App Password setup (if EMAIL_PASSWORD missing or auth fails)

Most email providers (Gmail, Outlook, Yahoo, iCloud) require an App Password for IMAP/SMTP. This is a one-time setup.

### Step 1: Detect provider from EMAIL_USER domain

```python
# Provider detection logic (same as email-client.py)
domain = EMAIL_USER.split("@")[1]
# gmail.com / googlemail.com → Google
# outlook.com / hotmail.com / live.com → Microsoft
# yahoo.com → Yahoo
# icloud.com / me.com → Apple
```

### Step 2: Auto-open 2FA setup page in user's browser

Use `open` (macOS), `xdg-open` (Linux), or `start` (Windows) via Bash to open the page in the user's **default browser** (where they're already logged in):

```bash
# Detect OS and open URL
open_url() {
  case "$(uname -s)" in
    Darwin) open "$1" ;;
    Linux)  xdg-open "$1" 2>/dev/null || echo "Please open: $1" ;;
    *)      echo "Please open: $1" ;;
  esac
}
```

**Gmail:**
```bash
open_url "https://myaccount.google.com/signinoptions/two-step-verification"
```

**Outlook:**
```bash
open_url "https://account.live.com/proofs/manage"
```

**Yahoo:**
```bash
open_url "https://login.yahoo.com/myc/security"
```

**iCloud:**
```bash
open_url "https://appleid.apple.com/account/manage"
```

Print:
```
🌐 I've opened the 2FA setup page in your browser.
   Please enable 2-Step Verification, then say "ok".
```

**Wait for "ok".**

### Step 3: Auto-open App Password page

After user confirms 2FA is done, open the App Password page:

**Gmail:**
```bash
open_url "https://myaccount.google.com/apppasswords"
```

**Outlook:**
```bash
open_url "https://account.live.com/proofs/AppPassword"
```

Print:
```
🌐 I've opened the App Password page.
   Create one (name it "weekly-report"), then paste the password here.
```

**Wait for user to paste the App Password.** (This is the only thing they type)

### Step 4: Save and verify

After receiving the password, save to `.env` as `EMAIL_PASSWORD` and test:

```bash
echo "Weekly Report email test — if you see this, SMTP works!" > /tmp/email-test.txt
EMAIL_USER="..." EMAIL_PASSWORD="..." python3 .claude/skills/weekly-report/scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "Weekly Report email test" --body-file /tmp/email-test.txt
rm /tmp/email-test.txt
```

If OK → `✅ Email configured. Test email sent to {EMAIL_USER}.`
If fail → print error and ask user to retry.

## 0d: Combine manual steps

After all auto-installs, print ONE message for remaining manual steps:

```
⚠️ First-time setup (one-time only):
  {list only items that still need user action}

Please complete these, then say "ok".
```

If no manual steps needed, skip to verification.

Wait for "ok" / "done" / "好了" — only if manual steps exist.

## 0e: Verify

Re-run health check from 0a. If all ✅, return to pipeline.
For Claude Desktop: `⚠️ Please restart Claude Desktop to apply MCP changes, then say "ok".`

## User interaction principle

User only interacts for **three things** during the entire `/weekly-report` flow:
1. **First-run setup** — connect MCPs + paste App Password (once only)
2. **Logging in** — if email/MCP sessions expire (rare)
3. **Approving the report** — review draft → send

Everything else is automated.
