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

**Slack MCP** (plugin): Print `⚠️ Run /mcp → connect Slack plugin`

**Notion MCP** (plugin): Print `⚠️ Run /mcp → connect Notion plugin`

**GitHub**: Print `⚠️ Run 'gh auth login' in terminal`

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

### Guide the user through it:

```
⚠️ Email needs an App Password for {EMAIL_USER}.
   This is a one-time setup (2 minutes):

   1. Open this URL in your browser:
      - Gmail: https://myaccount.google.com/signinoptions/two-step-verification
      - Outlook: https://account.live.com/proofs/manage
      - Yahoo: https://login.yahoo.com/myc/security
      - iCloud: https://appleid.apple.com/account/manage

   2. Enable 2-Step Verification (if not already on)

   3. Then go to App Passwords:
      - Gmail: https://myaccount.google.com/apppasswords
      - Outlook: https://account.live.com/proofs/AppPassword
      - Yahoo: Security → Generate app password
      - iCloud: Sign-In & Security → App-Specific Passwords

   4. Create an App Password (name it "weekly-report")

   5. Paste the password here.
```

**Wait for user to paste the App Password.**

After receiving it, save to `.env` as `EMAIL_PASSWORD` and re-test SMTP:
```bash
echo "test" > /tmp/email-test.txt
python3 .claude/skills/weekly-report/scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "Weekly Report email test" --body-file /tmp/email-test.txt
rm /tmp/email-test.txt
```

If OK → `✅ Email configured successfully.`
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
