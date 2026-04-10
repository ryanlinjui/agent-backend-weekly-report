# Q&A Auto-Polling

After the report is sent, **immediately** run a Q&A check, then start a recurring cron job every 30 seconds.

## Setup

### 1. Immediate first check

Right after Step 9 (delivery summary), run the Q&A check prompt below once immediately — don't wait for the first cron tick.

### 2. Start recurring cron

Use the `CronCreate` tool:

- **cron:** `* * * * *` (every minute — CronCreate minimum. The prompt itself runs fast, achieving ~30s effective interval with execution time)
- **recurring:** true
- **durable:** false (session-only — stops when session closes)
- **prompt:**

```
Automated Q&A check for weekly-report skill.

Read .env for config. Check for inbound questions:

1. EMAIL: Use Chrome DevTools MCP to open Gmail and search for unread replies with subject "Re: Weekly Report". For each reply, compose a grounded answer and reply via Gmail. Follow references/inbound-qa-email.md.

2. LINE: Use LINE Bot MCP to check for and reply to messages. Follow references/inbound-qa-line.md.

Grounding rules: only reference items from raw data. Never fabricate.
If any MCP is not available, skip that channel with a warning.
Be autonomous — do not ask for confirmation.
Print a summary at the end.
```

## After creating the job, print:

```
🔄 Inbound Q&A auto-polling started (every ~1 min).
   Checks: Gmail replies + LINE messages
   Stops when: this session closes
   Manual check: /weekly-report-qa
   Cancel: tell me "stop qa polling"
```

## Stopping

If user says "stop qa polling", use `CronDelete` to remove the job.
