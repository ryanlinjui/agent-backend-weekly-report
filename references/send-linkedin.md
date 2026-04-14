# Send: LinkedIn DM

**Use `playwright-headless` MCP** — LinkedIn DM sending must never pop a visible window (skill may run as a scheduled task). Login happens once via `playwright-login` in Step 0 Phase 3; the session is then reused by `playwright-headless` through the shared user-data directory configured for both MCPs.

For each `profileUrl` in `LINKEDIN_RECIPIENTS`:

1. Read the template file at `scripts/linkedin-dm.js`
2. Replace `__PROFILE_URL__` with `JSON.stringify(profileUrl)` and `__MESSAGE__` with `JSON.stringify(message)` — `JSON.stringify` handles escaping for quotes, unicode, and newlines safely
3. Call `mcp__playwright-headless__browser_run_code` with the substituted code string as the `code` arg
4. On `{ sent: true }` → report success to user
5. On error → if the page redirected to `/login` or `/authwall`, re-run Step 0 Phase 3 LinkedIn login via `playwright-login`, then retry

## Why `browser_run_code` (not turn-by-turn MCP calls)

The template runs as a single atomic JS function inside the browser. No LLM deliberation between clicks — which is what made older Playwright MCP approaches flaky (12+ min, frequent failures). This path consistently completes in ~10s per recipient.

## Quirks the template already handles

- **Compose bubbles stack**: Each recipient's dialog docks at the bottom and pushes later ones off-screen. Template clicks the `Close your conversation with …` button after sending to dismiss the bubble, and defensively presses `Escape` before opening Message in case a bubble leaked in from a previous run.
- **Off-viewport dialogs**: `click({ force: true })` bypasses Playwright's viewport check for dialogs anchored outside the visible area.
- **Multiple textboxes in DOM**: Open conversations each keep their own composer. `.last()` targets the just-opened one.

## Session expires?

Re-run Step 0 Phase 3 LinkedIn login via `playwright-login`. Sessions typically last weeks.
