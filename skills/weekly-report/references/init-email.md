# Init: Email

If `EMAIL_PASSWORD` empty or SMTP test fails:

1. Open Google App Password page with Playwright (user logs in + 2FA)
2. Navigate to 2FA settings → enable if OFF (user does phone verify only)
3. Navigate to App Passwords page → fill "weekly-report" → click Create
4. Read 16-character password from page → save to `.env` as `EMAIL_PASSWORD`
5. Extract email address from account header → save to `.env` as `EMAIL_USER`
6. Verify: `scripts/email-client.py send` test succeeds → ✅
