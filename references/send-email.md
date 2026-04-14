# Send: Email (Gmail)

**Use the `weekly-report` (headless) `@playwright/cli` session** — email sending must never pop a visible window (the skill may run as a scheduled task under `permission: bypass`, with no user present to dismiss a window). Login happens once via the `weekly-report-login` headed session in Step 0 Phase 3; the cookies persist in the shared `.browser-session/` profile so the headless session reuses them.

**One send per recipient.** The skill loops `REPORT_RECIPIENTS` and calls the template once per address. Each message has exactly one recipient in To — so nobody sees anyone else's address, and the send avoids the BCC-broadcast pattern that Gmail routinely flags as spam.

## Flow

First, make sure the `weekly-report` session is open at Gmail:

```bash
playwright-cli -s=weekly-report-login close                         # Rule 6 — no visible session racing the profile lock
playwright-cli -s=weekly-report open https://mail.google.com \
  --persistent --profile=.browser-session                           # idempotent if already open
```

Then, for each `toAddress` in `REPORT_RECIPIENTS`:

1. Read the template file at `scripts/gmail-send.js`.
2. Substitute three placeholders via `JSON.stringify(...)` (handles quotes, unicode, and newlines safely):
   - `__TO__` — the single recipient address (string or `[addr]`)
   - `__SUBJECT__`, `__BODY__` — as usual
3. Write the substituted code to `.pw-tmp/gmail-send.js` (must live under the project cwd — `run-code --filename` sandboxes to cwd).
4. Run:
   ```bash
   playwright-cli --raw -s=weekly-report run-code --filename=.pw-tmp/gmail-send.js
   ```
5. On stdout `{"sent":true}` → move on to the next recipient.
6. On error → if the page redirected to a Google sign-in URL, re-run Step 0 Phase 3 Email login via the `weekly-report-login` headed session, then retry this recipient; otherwise record which recipient failed and continue with the rest.

After the loop finishes, close the session (Rule 6):

```bash
playwright-cli -s=weekly-report close
```

Only then report the aggregate result to the user.

## Why one email per recipient (not BCC broadcast)

BCC broadcast was tested and reliably went to **Spam** in recipients' Gmail — even with the sender in To, the Playwright-automation fingerprint plus a multi-recipient BCC list is a strong spam signal. Per-recipient sends from the same sender landed in **Inbox**. The cost is N sends instead of 1, but each takes ~5–10s and they run to separate inboxes, so latency is linear and acceptable.

Each send has exactly one recipient, so privacy is preserved by construction — no recipient sees any other recipient's address.

## Why `run-code` (not turn-by-turn CLI calls)

The template runs as a single atomic JS function inside the browser — no LLM deliberation between clicks. Completes in ~5–10s per email instead of the minute-scale turn-by-turn flow you'd get driving `click` / `fill` / `press` as separate CLI invocations.

## Scope

Template is **Gmail-only**. The skill infers `email_platform` from the user's address (Step 0 Phase 2). When it's not `gmail`, the agent falls back to the generic flow: navigate to `email_webmail_url` on the `weekly-report` session and adapt selectors on the fly via an inline `run-code` snippet matched to whatever webmail is loaded.

## Quirks the template already handles

- **Two elements with aria-label "Message Body"**: Gmail ships a hidden `<textarea>` and the visible contenteditable `<div>` both labeled "Message Body". The generic role locator matches both and `fill()` can land on the hidden one, leaving the visible editor empty. Template uses `div[role="textbox"][aria-label="Message Body"]` to disambiguate.
- **Recipient chip commit — one address at a time**: the To combobox keeps the typed address as raw text until `Tab` converts it into a chip. Filling a single comma-separated string and pressing Tab once only commits the *first* address; the rest are silently dropped. The template loops: fill one address → Tab → fill next → Tab, so every recipient gets its own chip. (Relevant only if `to` carries multiple addresses — the skill's default loop passes one at a time.)
- **Bidi marks in Send button label**: the aria-label is `Send ‪(⌘Enter)‬` with invisible LRI/PDI unicode around the shortcut hint. Exact-match locators fail. Template uses a `/^Send/` regex.
- **Leftover dialogs**: if a draft from a prior run is still open, selectors could resolve to the old dialog. Template scopes everything to `[role="dialog"].last()` — the newly opened compose.

## Session expires?

Re-run Step 0 Phase 3 Email login via the `weekly-report-login` headed session. Sessions typically last weeks.
