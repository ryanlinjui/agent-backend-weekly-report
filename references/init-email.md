# Init: Email

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

1. Read `email_platform` and `email_webmail_url` from `config.json` (set during Phase 2)
2. **`browser_close` any active `playwright-headless` session first** (Rule 6 — shared `--user-data-dir` means both MCPs can't run at once, or Chromium lockfiles corrupt the profile).
3. Call `playwright-login` `browser_navigate` to the saved `email_webmail_url` (visible browser)
4. Tell the user which account to log in with, then block on `AskUserQuestion` with `options: ["Done, I'm logged in", "Cancel"]` — do NOT poll the page. The user takes as long as they need; the skill resumes only when they click `Done`.
5. After `Done`: read the inbox page to confirm the logged-in address matches `email_user` (mismatch → log out, repeat step 4). Session auto-persists to the shared `--user-data-dir`.
6. **`browser_close` the visible browser** — required before any subsequent `playwright-headless` call.
7. Done — subsequent sends use `playwright-headless` with the same persisted session.

The agent uses `email_platform` and `email_webmail_url` to dynamically determine how to compose, send, and read emails. No hardcoded platform assumptions — the agent inspects the page and adapts its selectors/flow to whatever webmail is loaded.

**Session expires?** Re-run steps 2-5. Sessions typically last weeks to months.
