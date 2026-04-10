# Q&A Auto-Polling

After the report is sent, **immediately** run a Q&A check, then start recurring polling every 30 seconds.

## Setup

### 1. Immediate first check

Right after Step 9 (delivery summary), run the Q&A check prompt below once immediately.

### 2. Start recurring polling (every 30s)

Use the `loop` skill: `/loop 30s /weekly-report-qa`

This runs `/weekly-report-qa` every 30 seconds until the session closes or the user stops it.

If the `loop` skill is not available, fallback to `CronCreate` with `* * * * *` (every 1 minute).

## After starting, print:

```
🔄 Inbound Q&A auto-polling started (every 30s).
   Checks: Gmail replies + LINE messages
   Stops when: this session closes
   Manual check: /weekly-report-qa
   Cancel: tell me "stop qa polling"
```

## Stopping

If user says "stop qa polling", stop the loop.
