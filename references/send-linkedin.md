# Send: LinkedIn DM

**Use the `weekly-report` (headless) `@playwright/cli` session** — LinkedIn DM sending must never pop a visible window (the skill may run as a scheduled task under `permission: bypass`). Login happens once via the `weekly-report-login` headed session in Step 0 Phase 3; the cookies persist in the shared `.browser-session/` profile so the headless session reuses them.

First, open the `weekly-report` session at LinkedIn:

```bash
playwright-cli -s=weekly-report-login close                       # Rule 6 — no visible session racing the profile lock
playwright-cli -s=weekly-report open https://www.linkedin.com \
  --persistent --profile=.browser-session
```

Then, for each `profileUrl` in `LINKEDIN_RECIPIENTS`:

1. Read the template file at `scripts/linkedin-dm.js`.
2. Replace `__PROFILE_URL__` with `JSON.stringify(profileUrl)` and `__MESSAGE__` with `JSON.stringify(message)` — `JSON.stringify` handles escaping for quotes, unicode, and newlines safely.
3. Write the substituted code to `.pw-tmp/linkedin-dm.js` (must live under the project cwd — `run-code --filename` sandboxes to cwd).
4. Run:
   ```bash
   playwright-cli --raw -s=weekly-report run-code --filename=.pw-tmp/linkedin-dm.js
   ```
5. On stdout `{"sent":true}` → report success to user.
6. On error → if the page redirected to `/login` or `/authwall`, re-run Step 0 Phase 3 LinkedIn login via the `weekly-report-login` headed session, then retry this recipient.

Close the session when the loop finishes:

```bash
playwright-cli -s=weekly-report close
```

## Why `run-code` (not turn-by-turn CLI calls)

The template runs as a single atomic JS function inside the browser. No LLM deliberation between clicks — which is what made earlier turn-by-turn approaches flaky (12+ min, frequent failures driving each `click` / `fill` as its own CLI call). This path consistently completes in ~10s per recipient.

## Quirks the template already handles

- **Compose bubbles stack**: Each recipient's dialog docks at the bottom and pushes later ones off-screen. Template clicks the `Close your conversation with …` button after sending to dismiss the bubble, and defensively presses `Escape` before opening Message in case a bubble leaked in from a previous run.
- **Off-viewport dialogs**: `click({ force: true })` bypasses Playwright's viewport check for dialogs anchored outside the visible area.
- **Multiple textboxes in DOM**: Open conversations each keep their own composer. `.last()` targets the just-opened one.

## Session expires?

Re-run Step 0 Phase 3 LinkedIn login via the `weekly-report-login` headed session. Sessions typically last weeks.
