---
name: weekly-report
description: Generate and send a weekly report summarizing the producer's activity across GitHub, Slack, and Notion. Delivers via Email, LINE, and LinkedIn DM. Use when the user asks for "weekly report", "週報", "my week in review", or similar. Also handles inbound Q&A — run separately to check and reply to questions about the report.
compatibility: Requires gh CLI. MCP servers auto-installed during init (Slack, Notion, LINE Bot, LinkedIn). Browser automation via Playwright for email setup. cloudflared for LINE webhook.
---

# Weekly Report Skill

Two modes:
- **Weekly report** — generate + approve + send
- **Q&A** — check for inbound questions and reply in the producer's voice

## Weekly Report Pipeline

### Step 0: Init & health check

Check each service in order. **If ANY is ❌, fix it immediately before moving to the next.** Do NOT proceed to Step 1 until ALL are ✅.

| # | Service | Check | If ❌, follow | Auto or user? |
|---|---|---|---|---|
| 1 | GitHub | `gh auth status` | [init-github.md](references/init-github.md) | User clicks auth in browser |
| 2 | Email | SMTP send test via `scripts/email-client.py` | [init-email.md](references/init-email.md) | User logs in + 2FA; skill creates App Password |
| 3 | Slack | Slack MCP tools available? | [init-slack.md](references/init-slack.md) | User runs `/mcp` connect |
| 4 | Notion | Notion MCP tools available? | [init-notion.md](references/init-notion.md) | User runs `/mcp` connect |
| 5 | LINE | LINE Bot MCP tools available + webhook active? | [init-line.md](references/init-line.md) | User logs in LINE; skill does the rest |
| 6 | LinkedIn | LinkedIn MCP tools available + session valid? | [init-linkedin.md](references/init-linkedin.md) | User logs in LinkedIn once |

Print health check result:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Service health check
  GitHub:   ✅ / ❌
  Email:    ✅ / ❌
  Slack:    ✅ / ❌
  Notion:   ✅ / ❌
  LINE:     ✅ / ❌
  LinkedIn: ✅ / ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Rules:** Login pages = hands off. Post-login = skill drives. Auto-install MCPs when possible. Only ask user when physically required (password, SMS, `/mcp` connect).

### Step 1: Compute the window

Read `.env` for `REPORT_WINDOW_DAYS` (default: 7).

- `W_start` = now − `REPORT_WINDOW_DAYS` days, formatted `YYYY-MM-DD`
- `W_end` = now, formatted `YYYY-MM-DD`

### Step 2: Fetch raw data from ALL sources

Fetch in order. Keep all raw output in working memory — do not summarize yet. If a source fails, warn and continue. STOP only if ALL sources fail.

| Source | Reference | Tool |
|---|---|---|
| GitHub | [references/fetch-github.md](references/fetch-github.md) | `gh` CLI |
| Slack | [references/fetch-slack.md](references/fetch-slack.md) | Slack MCP |
| Notion | [references/fetch-notion.md](references/fetch-notion.md) | Notion MCP |

### Step 3: Draft the report

1. Read [assets/report-template.md](assets/report-template.md) — follow its sections, order, and emojis exactly.
2. Follow [references/draft-rules.md](references/draft-rules.md) — grounding rules, section rules, voice profile.
3. Key rule: **every item must trace to raw data from Step 2. Never fabricate.**

### Step 4: Approval gate

Read [assets/approval-gate-template.md](assets/approval-gate-template.md), substitute variables with real values, print in chat, and **WAIT** for user choice.

| Input | Action |
|---|---|
| `1` / `送出` / `send` / `yes` | → Step 5 |
| `2 <instruction>` / `修改` | apply edit → reprint approval gate |
| `3` / `重新生成` | re-draft from same data (no re-fetch) → reprint |
| `4` / `取消` / `cancel` | `❌ Cancelled.` → STOP |
| `dry run` | print what would be sent, return to approval gate |
| anything else | ask to clarify |

**CRITICAL:** never auto-select option 1. When in doubt, ask.

### Step 5: Send to ALL configured channels

Each channel is independent — if one fails, continue to the next.

| Channel | Reference | Method |
|---|---|---|
| Email | [references/send-email.md](references/send-email.md) | IMAP/SMTP via `scripts/email-client.py` |
| LINE | [references/send-line.md](references/send-line.md) | LINE Bot MCP broadcast |
| LinkedIn | [references/send-linkedin.md](references/send-linkedin.md) | Playwright → LinkedIn web |

### Step 6: Delivery summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Delivery Summary
  Email:    ✅ / ❌ / ⚠️ not configured
  LINE:     ✅ / ❌ / ⚠️ not configured
  LinkedIn: ✅ / ❌ / ⚠️ not configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Q&A Mode

One-shot check for inbound questions and reply. Run separately from the report pipeline.

### Step 1: Load report context

If raw data from the last report is still in working memory, use it. Otherwise, re-fetch from all sources (same window as last report).

### Step 2: Check Email

Follow [references/inbound-qa-email.md](references/inbound-qa-email.md). Read unread replies via IMAP, compose grounded answers, send replies via SMTP.

### Step 3: Check LINE

Follow [references/inbound-qa-line.md](references/inbound-qa-line.md). Read messages from webhook inbox (`/tmp/line-inbox.json`), compose grounded answers, reply via LINE Bot MCP push.

### Step 4: Q&A summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 Q&A Summary
  Email: {N} questions answered
  LINE:  {N} questions answered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Hard rules

1. **Never send without explicit approval** at the approval gate.
2. **Never fabricate** — every item must trace to raw data.
3. **Never skip init** — all services must be ✅ before pipeline starts.
4. **Never re-fetch during regenerate** (option 3) — use cached raw data.
5. **Never guess** when input is ambiguous — ask.
6. **Never hardcode config** — always read from `.env`.
7. **Reply in the user's voice** — follow [references/voice-profile.md](references/voice-profile.md) for QA responses.
