---
name: weekly-report-qa
description: Check for and reply to questions about the weekly report. Use when user says "qa", "check replies", "回覆".
---

# Q&A

1. Load raw data from last report (or re-fetch if not in memory)
2. Check Email: read unread replies via IMAP (`scripts/email-client.py read`), compose grounded answer, reply via SMTP
3. Check LINE: read `/tmp/line-inbox.json` for unhandled messages, reply via LINE Bot MCP push
4. Print summary of questions answered

Reply in the user's voice — analyze their Slack messages to match their tone. Never fabricate.
