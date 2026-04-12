# Init: Email

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or any other browser tool.

If `EMAIL_PASSWORD` empty or SMTP test fails:

1. Use `ToolSearch("playwright")` to load Playwright tools
2. Open Google App Password page with Playwright (user logs in + 2FA)
3. Navigate to 2FA settings → enable if OFF (user does phone verify only)
4. Navigate to App Passwords page → fill "weekly-report" → click Create
5. Read 16-character password from page → save to `.env` as `EMAIL_PASSWORD`
6. Extract email address from account header → save to `.env` as `EMAIL_USER`
7. Verify: `scripts/email-client.py send` test succeeds → ✅
