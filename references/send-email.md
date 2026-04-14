# Send: Email (Gmail)

**Use `playwright-headless` MCP** — email sending must never pop a visible window (skill may run as a scheduled task). Login happens once via `playwright-login` in Step 0 Phase 3; the session is then reused by `playwright-headless` through the shared user-data directory configured for both MCPs.

**One send per recipient.** The skill loops `REPORT_RECIPIENTS` and calls the template once per address. Each message has exactly one recipient in To — so nobody sees anyone else's address, and the send avoids the BCC-broadcast pattern that Gmail routinely flags as spam.

## Flow

For each `toAddress` in `REPORT_RECIPIENTS`:

1. Read the template file at `scripts/gmail-send.js`
2. Substitute three placeholders via `JSON.stringify(...)` (handles quotes, unicode, and newlines safely):
   - `__TO__` — the single recipient address (string or `[addr]`)
   - `__SUBJECT__`, `__BODY__` — as usual
3. Call `mcp__playwright-headless__browser_run_code` with the substituted code string as the `code` arg
4. On `{ sent: true }` → move on to the next recipient
5. On error → if the page redirected to a Google sign-in URL, re-run Step 0 Phase 3 Email login via `playwright-login`, then retry; otherwise report which recipient failed and continue with the rest

Only after the loop finishes, report the aggregate result to the user.

## Why one email per recipient (not BCC broadcast)

BCC broadcast was tested and reliably went to **Spam** in recipients' Gmail — even with the sender in To, the Playwright-automation fingerprint plus a multi-recipient BCC list is a strong spam signal. Per-recipient sends from the same sender landed in **Inbox**. The cost is N sends instead of 1, but each takes ~5–10s and they run to separate inboxes, so latency is linear and acceptable.

Each send has exactly one recipient, so privacy is preserved by construction — no recipient sees any other recipient's address.

## Why `browser_run_code` (not turn-by-turn MCP calls)

The template runs as a single atomic JS function inside the browser — no LLM deliberation between clicks. Completes in ~5–10s per email instead of the minute-scale turn-by-turn flow.

## Scope

Template is **Gmail-only**. The skill infers `email_platform` from the user's address (Step 0 Phase 2). When it's not `gmail`, the agent falls back to the generic flow: navigate to `email_webmail_url` with `playwright-headless` and adapt selectors on the fly to whatever webmail is loaded.

## Quirks the template already handles

- **Two elements with aria-label "Message Body"**: Gmail ships a hidden `<textarea>` and the visible contenteditable `<div>` both labeled "Message Body". The generic role locator matches both and `fill()` can land on the hidden one, leaving the visible editor empty. Template uses `div[role="textbox"][aria-label="Message Body"]` to disambiguate.
- **Recipient chip commit — one address at a time**: the To combobox keeps the typed address as raw text until `Tab` converts it into a chip. Filling a single comma-separated string and pressing Tab once only commits the *first* address; the rest are silently dropped. The template loops: fill one address → Tab → fill next → Tab, so every recipient gets its own chip. (Relevant only if `to` carries multiple addresses — the skill's default loop passes one at a time.)
- **Bidi marks in Send button label**: the aria-label is `Send ‪(⌘Enter)‬` with invisible LRI/PDI unicode around the shortcut hint. Exact-match locators fail. Template uses a `/^Send/` regex.
- **Leftover dialogs**: if a draft from a prior run is still open, selectors could resolve to the old dialog. Template scopes everything to `[role="dialog"].last()` — the newly opened compose.

## Session expires?

Re-run Step 0 Phase 3 Email login via `playwright-login`. Sessions typically last weeks.
