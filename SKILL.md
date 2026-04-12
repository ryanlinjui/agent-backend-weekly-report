---
name: weekly-report
description: Generate and send a weekly report summarizing the producer's activity across GitHub, Slack, and Notion. Delivers via Email, LINE, and LinkedIn DM. Use when the user asks for "weekly report", "週報", "my week in review", or similar. Also handles inbound Q&A — run separately to check and reply to questions about the report.
compatibility: Requires gh CLI. MCP servers auto-installed during init (Slack, Notion, LINE Bot, LinkedIn). Browser automation via Playwright for email setup. cloudflared for LINE webhook.
---

# Weekly Report Skill

Three modes:
- **Weekly report** — generate + approve + send
- **Q&A** — check for inbound questions and reply in the producer's voice
- **Config** — add/change recipients, re-init services, update `.env`

## Weekly Report Pipeline

### Step 0: Init & health check

Read `.env`. Run ALL init references below **sequentially and automatically**. Do NOT ask the user what to set up. Do NOT offer options. Do NOT suggest skipping. Just start from #1 and go through each one.

For each ❌ service: follow its init reference, try every approach in order, handle errors yourself. Only pause when user MUST physically act (type password in browser, enter SMS code, run `/mcp`). After the user completes that one action, immediately continue — do not ask "what next".

1. [init-github.md](references/init-github.md)
2. [init-email.md](references/init-email.md)
3. [init-slack.md](references/init-slack.md)
4. [init-notion.md](references/init-notion.md)
5. [init-line.md](references/init-line.md)
6. [init-linkedin.md](references/init-linkedin.md)

After ALL done, print [assets/health-check-template.md](assets/health-check-template.md).

**Environment note:** In Claude Desktop (no terminal), use `mcp__ide__executeCode` or edit config files directly instead of Bash/CLI commands. For MCP installation, edit `~/Library/Application Support/Claude/claude_desktop_config.json` directly.

### Step 1: Compute window & fetch raw data

Compute window: `W_start` = now − `REPORT_WINDOW_DAYS` days, `W_end` = now (both `YYYY-MM-DD`).

Fetch from all sources. Keep raw output in working memory — do not summarize yet. If a source fails, warn and continue. STOP only if ALL fail.

| Source | Reference | Tool |
|---|---|---|
| GitHub | [references/fetch-github.md](references/fetch-github.md) | `gh` CLI |
| Slack | [references/fetch-slack.md](references/fetch-slack.md) | Slack MCP |
| Notion | [references/fetch-notion.md](references/fetch-notion.md) | Notion MCP |

### Step 2: Draft the report

1. Read [assets/report-template.md](assets/report-template.md) — follow its sections, order, and emojis exactly.
2. Follow [references/draft-rules.md](references/draft-rules.md) — grounding rules, section rules, voice profile.
3. Key rule: **every item must trace to raw data from Step 2. Never fabricate.**

### Step 3: Approval gate

Read [assets/approval-gate-template.md](assets/approval-gate-template.md), substitute variables with real values, print in chat, and **WAIT** for user choice.

| Input | Action |
|---|---|
| `1` / `送出` / `send` / `yes` | → Step 4 |
| `2 <instruction>` / `修改` | apply edit → reprint approval gate |
| `3` / `重新生成` | re-draft from same data (no re-fetch) → reprint |
| `4` / `取消` / `cancel` | `❌ Cancelled.` → STOP |
| `dry run` | print what would be sent, return to approval gate |
| anything else | ask to clarify |

**CRITICAL:** never auto-select option 1. When in doubt, ask.

### Step 4: Send to ALL configured channels

Each channel is independent — if one fails, continue to the next.

| Channel | Reference | Method |
|---|---|---|
| Email | [references/send-email.md](references/send-email.md) | IMAP/SMTP via `scripts/email-client.py` |
| LINE | [references/send-line.md](references/send-line.md) | LINE Bot MCP broadcast |
| LinkedIn | [references/send-linkedin.md](references/send-linkedin.md) | Playwright → LinkedIn web |

### Step 5: Delivery summary

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

## Config Mode

Run when user wants to change settings. Same as Step 0 init but interactive.

Use when user says "config", "設定", "change recipients", "add recipient", "weekly-report-config", or similar.

1. Show current `.env` settings (mask passwords)
2. Ask what to change
3. Update `.env`
4. Test the changed service (send test to new recipient, verify MCP connection, etc.)
5. If test fails → explain issue → ask user how to proceed
6. Print updated health check

---

## Hard rules

1. **Never send without explicit approval** at the approval gate.
2. **Never fabricate** — every item must trace to raw data.
3. **Never skip init** — all services must be ✅ before pipeline starts.
4. **Never re-fetch during regenerate** (option 3) — use cached raw data.
5. **Never hardcode config** — always read from `.env`.
6. **Reply in the user's voice** — follow [references/voice-profile.md](references/voice-profile.md) for QA responses.
7. **NEVER ask the user to choose, decide, or confirm during init.** Do NOT say "What would you like to do?", "Which services?", "Would you like to skip?", or show any option menu. Init ALL services automatically, one by one. If something fails, try a different approach yourself. The ONLY acceptable pause is when the user must physically type a password, enter an SMS code, or run `/mcp` — and after that, immediately continue to the next step without asking anything.
