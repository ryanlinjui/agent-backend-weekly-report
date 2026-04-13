# Init: Email

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

1. Read `email_platform` and `email_webmail_url` from `config.json` (set during Phase 2)
2. Call `playwright-login` `browser_navigate` to the saved `email_webmail_url` (visible browser)
3. User logs in manually
4. Wait until inbox fully loads — session auto-saved to `.browser-session/`
5. **Close visible browser**
6. Done — subsequent sends use `playwright-headless` with saved session

The agent uses `email_platform` and `email_webmail_url` to dynamically determine how to compose, send, and read emails. No hardcoded platform assumptions — the agent inspects the page and adapts its selectors/flow to whatever webmail is loaded.

**Session expires?** Re-run steps 2-5. Sessions typically last weeks to months.
