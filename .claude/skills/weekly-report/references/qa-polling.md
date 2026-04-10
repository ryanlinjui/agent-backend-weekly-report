# Q&A Auto-Polling

After the report is sent, start a cron job to automatically check for and reply to inbound questions.

## Setup

Use the `CronCreate` tool:

- **cron:** `17 * * * *` (every hour at :17. For testing: `* * * * *`)
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
🔄 Inbound Q&A auto-polling started (every hour at :17).
   Checks: Gmail replies + LINE messages
   Stops when: this session closes
   Manual check: /weekly-report-qa
   Cancel: tell me "stop qa polling"
```

## Stopping

If user says "stop qa polling", use `CronDelete` to remove the job.
