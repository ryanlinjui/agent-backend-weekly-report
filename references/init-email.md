# Init: Email

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

1. Read `email_user` from `config.json` to determine the email provider
2. Call `playwright-login` `browser_navigate` to the provider's webmail URL (visible browser):
   - `@gmail.com` / `@googlemail.com` → `https://mail.google.com`
   - `@outlook.com` / `@hotmail.com` / `@live.com` → `https://outlook.live.com`
   - `@yahoo.com` → `https://mail.yahoo.com`
   - Other domains → try `https://mail.<domain>` or ask user for webmail URL
3. User logs in manually
4. Wait until inbox fully loads — session auto-saved to `.browser-session/`
5. **Close visible browser**
6. Done — subsequent sends use `playwright-headless` with saved session

**Session expires?** Re-run steps 2-5. Sessions typically last weeks to months.
