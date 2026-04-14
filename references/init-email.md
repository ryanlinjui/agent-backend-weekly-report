# Init: Email

**Use `@playwright/cli` only.** Do NOT use "Claude in Chrome", `open` bash, Chrome DevTools MCP, or search MCP registry.

Run all commands from the skill's root folder so the `--profile=.browser-session` path is relative to cwd. Rule 6 applies: only one session open at a time — `close` before switching modes.

1. Read `email_platform` and `email_webmail_url` from `config.json` (set during Phase 2).
2. **Close any active `weekly-report` headless session first** (Rule 6 — shared `.browser-session/` profile, simultaneous headed + headless corrupts the Chromium lockfile):
   ```bash
   playwright-cli -s=weekly-report close
   ```
3. Open the visible browser pointed at the saved `email_webmail_url`:
   ```bash
   playwright-cli -s=weekly-report-login open "$email_webmail_url" --headed --persistent --profile=.browser-session
   ```
4. Tell the user which account to log in with, then block on `AskUserQuestion` with `options: ["Done, I'm logged in", "Cancel"]` — do NOT poll the page. The user takes as long as they need; the skill resumes only when they click `Done`.
5. After `Done`: read the inbox page via a short `run-code` snippet on the `weekly-report-login` session to confirm the logged-in address matches `email_user` (mismatch → log out, repeat step 4). Session state auto-persists to `.browser-session/`.
6. **Close the visible browser** — required before any subsequent `weekly-report` (headless) call:
   ```bash
   playwright-cli -s=weekly-report-login close
   ```
7. Done — subsequent sends reopen the `weekly-report` headless session against the same `.browser-session/` profile, so the cookies from the headed login are already present.

The agent uses `email_platform` and `email_webmail_url` to dynamically determine how to compose, send, and read emails. No hardcoded platform assumptions — the agent inspects the page and adapts its selectors/flow to whatever webmail is loaded.

**Session expires?** Re-run steps 2-6. Sessions typically last weeks to months.
