---
name: weekly-report
description: Generate and send a weekly report summarizing the producer's activity across GitHub, Slack, and Notion. Delivers via Email, LINE, and LinkedIn DM. Use when the user asks for "weekly report", "週報", "my week in review", or similar. Drafts against a fixed template, shows in chat for approval, sends only after explicit confirmation.
compatibility: Requires gh CLI and MCP servers (Slack, Notion, LINE Bot, LinkedIn). Optional: Chrome DevTools, Playwright, cloudflared.
---

# Weekly Report Skill

Produce a weekly report from GitHub, Slack, and Notion, then deliver via Email, LINE, and LinkedIn DM with a mandatory approval gate.

## Pipeline

### Step 0: Init & health check

Read and follow [references/init-setup.md](references/init-setup.md).

Load `.env` config, check all services. **If ANY service is ❌, STOP and fix it immediately before proceeding.** Do NOT skip broken services — run the corresponding init/repair flow (0b/0c) until the service is ✅, then re-check. Only proceed to Step 1 when ALL services are ✅.

### Step 1: Check `gh` auth

Run `gh auth status`. If it fails, print error and STOP.

### Step 2: Compute the window

- `W_start` = now − `REPORT_WINDOW_DAYS` days (from `.env`), as `YYYY-MM-DD`
- `W_end` = now, as `YYYY-MM-DD`

### Step 3: Fetch raw data from ALL sources

Fetch in order. Keep all raw output in working memory. If a source fails, warn and continue. STOP only if ALL fail.

- **3a: GitHub** — follow [references/fetch-github.md](references/fetch-github.md)
- **3b: Slack** — follow [references/fetch-slack.md](references/fetch-slack.md)
- **3c: Notion** — follow [references/fetch-notion.md](references/fetch-notion.md)

### Step 4: Read the template

Read [assets/report-template.md](assets/report-template.md). Follow its sections, order, and emojis exactly.

### Step 5: Draft the report

Follow [references/draft-rules.md](references/draft-rules.md). Key rule: **every item must trace to raw data. Never fabricate.**

### Step 6: Approval gate

Read [assets/approval-gate-template.md](assets/approval-gate-template.md), substitute `{W_start}`, `{W_end}`, `{GMAIL_USER}`, `{REPORT_RECIPIENTS}`, `{DRAFT}` with real values, and print in chat.

### Step 7: Handle choice

| Input | Action |
|---|---|
| `1` / `送出` / `send` / `yes` | → Step 8 |
| `2 <instruction>` / `修改 <instruction>` | edit → reprint Step 6 |
| bare `2` / bare `修改` | ask what to change → apply → reprint |
| `3` / `重新生成` | re-draft (no re-fetch) → reprint |
| `4` / `取消` / `cancel` | `❌ Cancelled.` → STOP |
| `dry run` | print draft, return to Step 6 |
| anything else | ask to clarify |

**CRITICAL:** never auto-select option 1.

### Step 8: Send

- **8a: Email** — follow [references/send-email.md](references/send-email.md) (IMAP/SMTP via email-client.py)
- **8b: LINE** — follow [references/send-line.md](references/send-line.md) (LINE Bot MCP broadcast)
- **8c: LinkedIn** — follow [references/send-linkedin.md](references/send-linkedin.md) (LinkedIn MCP DM)

Each channel is independent — if one fails, continue to the next.

### Step 9: Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Delivery Summary
  Email:    ✅ / ❌
  LINE:     ✅ / ❌ / ⚠️ not configured
  LinkedIn: ✅ / ❌ / ⚠️ not configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 10: Start Q&A auto-polling

Follow [references/qa-polling.md](references/qa-polling.md). Creates a session-only cron job to check for inbound replies.

## Hard rules

1. Never send without explicit approval at Step 6.
2. Never reference items not in Step 3 raw output.
3. Never skip `gh auth` check.
4. Never re-fetch during regenerate (option 3).
5. Never guess when input is ambiguous — ask.
6. Never hardcode config — always read from `.env`.
