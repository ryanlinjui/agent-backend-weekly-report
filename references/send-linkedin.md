# Send: LinkedIn DM

**Use `playwright-login` MCP** — LinkedIn auth lives there after Step 0 Phase 3.
`playwright-login` and `playwright-headless` do NOT share cookies (separate browser contexts).

For each `profileUrl` in `LINKEDIN_RECIPIENTS`:

1. Read the template file at `scripts/linkedin-dm.js`
2. Replace `__PROFILE_URL__` with `JSON.stringify(profileUrl)` and `__MESSAGE__` with `JSON.stringify(message)` — `JSON.stringify` handles escaping for quotes, unicode, and newlines safely
3. Call `mcp__playwright-login__browser_run_code` with the substituted code string as the `code` arg
4. On `{ sent: true }` → report success to user
5. On error → if the page redirected to `/login` or `/authwall`, re-run Step 0 Phase 3 LinkedIn login via `playwright-login`, then retry

## Why `browser_run_code` (not turn-by-turn MCP calls)

The template runs as a single atomic JS function inside the browser. No LLM deliberation between clicks — which is what made older Playwright MCP approaches flaky (12+ min, frequent failures). This path consistently completes in ~10s per recipient.

## Quirks the template already handles

- **Leftover compose bubbles stack**: Previous recipient's dialog stays docked at the bottom of the page; new ones get pushed off-screen. Template presses `Escape` before clicking Message to dismiss any leftover.
- **Off-viewport dialogs**: `click({ force: true })` bypasses Playwright's viewport check for dialogs anchored outside the visible area.
- **Multiple textboxes in DOM**: Open conversations each keep their own composer. `.last()` targets the just-opened one.

## Session expires?

Re-run Step 0 Phase 3 LinkedIn login via `playwright-login`. Sessions typically last weeks.
