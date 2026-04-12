---
name: weekly-report-qa
description: Check for and reply to questions about the weekly report. Use when user says "qa", "check replies", "回覆".
---

# Q&A

1. Load raw data from last report (or re-fetch if not in memory)
2. Check each channel via `playwright-headless` (session loaded from `.browser-session/`):
   - **Email**: Gmail inbox → search replies to "Weekly Report" → read and reply
   - **LINE**: LINE OA Manager → Chat tab → check new messages → reply directly in chat (Playwright)
   - **LinkedIn**: LinkedIn inbox → check new messages → reply
3. Fallback: Chrome DevTools MCP if Playwright fails
4. Print summary of questions answered

Reply in the user's voice — analyze their Slack messages to match their tone. Never fabricate.
