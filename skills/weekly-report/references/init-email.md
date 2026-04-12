# Init: Email

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or any other browser tool. Do NOT search for tools — just call Playwright directly.

If `EMAIL_PASSWORD` empty or SMTP test fails:

1. Call Playwright `browser_navigate` to open `https://myaccount.google.com/apppasswords` (visible browser — user logs in + 2FA)
2. After login, navigate to 2FA settings → enable if OFF (user does phone verify only)
3. Navigate to App Passwords page → fill "weekly-report" → click Create
4. Read 16-character password from page → save to `.env` as `EMAIL_PASSWORD`
5. Extract email address from account header → save to `.env` as `EMAIL_USER`
6. Verify: `scripts/email-client.py send` test succeeds → ✅
