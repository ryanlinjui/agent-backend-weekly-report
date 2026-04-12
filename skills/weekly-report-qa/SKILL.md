---
name: weekly-report-qa
description: Check for and reply to questions about the weekly report. Use when user says "qa", "check replies", "回覆".
---

# Q&A

Read `config.json` from `skills/weekly-report/` to get recipients and tokens. Browser session is in `skills/weekly-report/.browser-session/` (loaded automatically via `.mcp.json`).

1. Load raw data from last report (or re-fetch if not in memory)
2. Check each channel via `playwright-headless` (session auto-loaded):
   - **Email**: Gmail inbox → search replies to "Weekly Report" → read and reply
   - **LINE**: LINE OA Manager → Chat tab → check new messages → reply directly in chat (Playwright)
   - **LinkedIn**: LinkedIn inbox → check new messages → reply
3. Fallback: Chrome DevTools MCP if Playwright fails
4. Print summary of questions answered

Reply in the user's voice — analyze their Slack messages to match their tone. Never fabricate.
