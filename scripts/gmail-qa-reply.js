// Reply inline to a specific Gmail thread.
// Template run via `playwright-cli run-code`.
//
// Runs on the `weekly-report` (headless) session. The session must already
// have Gmail cookies in its --profile. Prefer driving this from `threadUrl`
// returned by `scripts/gmail-qa-check.js` — it's more stable than re-searching.
//
// Usage (from the skill):
//   1. Read this file, replace placeholders with JSON.stringify(value):
//        __THREAD_URL__   from gmail-qa-check
//        __BODY__         the reply text
//   2. Write the substituted code to `.pw-tmp/gmail-qa-reply.js`.
//   3. Run:
//        playwright-cli --raw -s=weekly-report run-code \
//          --filename=.pw-tmp/gmail-qa-reply.js
//
// Returns: { sent: true } on success; throws on failure. Rule 8 applies —
// the caller MUST verify the return is exactly { sent: true }.

async (page) => {
  const threadUrl = __THREAD_URL__;
  const body = __BODY__;

  await page.goto(threadUrl);
  await page.waitForTimeout(1500);

  // Click the inline Reply button at the bottom of the thread.
  await page.getByRole('button', { name: 'Reply' }).first().click();
  await page.waitForTimeout(800);

  // Gmail's reply compose reuses the same contenteditable body field as
  // top-level compose — see scripts/gmail-send.js for the rationale on
  // disambiguating from the hidden <textarea>.
  const bodyBox = page.locator('div[role="textbox"][aria-label="Message Body"]').last();
  await bodyBox.click();
  await bodyBox.fill(body);

  // Send button — bidi marks in aria-label, match by prefix (same as compose).
  await page.getByRole('button', { name: /^Send/ }).first().click();

  // Verify delivery via the "Message sent" toast (same confirmation as compose).
  await page.getByText(/Message sent/i).waitFor({ timeout: 10000 });
  return { sent: true };
}
