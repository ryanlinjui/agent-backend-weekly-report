# Init: Email

**Use OpenCLI browser commands only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

1. Read `email_platform` and `email_webmail_url` from `config.json` (set during Phase 2)
2. Run `opencli browser open <email_webmail_url>`
3. Run `opencli browser state` to check if already logged in
4. If not logged in → ask user to log in to the webmail in their Chrome browser → after confirmed, re-run `opencli browser open` + `opencli browser state`
5. Verify logged-in email matches `email_user` in `config.json`
6. Run `opencli browser close`
7. Done — subsequent sends use `opencli browser open` with Chrome's saved session

The agent uses `email_platform` and `email_webmail_url` to dynamically determine how to compose, send, and read emails. No hardcoded platform assumptions — the agent runs `opencli browser state` to inspect the page and adapts its element indices and flow to whatever webmail is loaded.

**Session expires?** Ask user to re-login in Chrome. OpenCLI reuses Chrome's native session — no separate session storage.
