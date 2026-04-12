# Init: Email

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

1. Call `playwright-login` `browser_navigate` to `https://mail.google.com` (visible browser)
2. User logs in manually (account + password + 2FA)
3. Wait until Gmail inbox fully loads — session auto-saved to `.browser-session/`
4. Save user's email address to `.env` as `EMAIL_USER`
5. Done — subsequent sends use `playwright-headless` with saved session

**Session expires?** Re-run steps 1-3. Gmail sessions typically last weeks to months.
