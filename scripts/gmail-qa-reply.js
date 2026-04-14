// Reply inline to a specific Gmail thread.
// Template for the Playwright MCP `browser_run_code` tool.
//
// Runs on `playwright-headless`. The MCP session must already be logged in
// to Gmail. Prefer driving this from `threadUrl` returned by
// `scripts/gmail-qa-check.js` — it's more stable than re-searching.
//
// Usage (from the skill):
//   const tpl = fs.readFileSync('scripts/gmail-qa-reply.js', 'utf8');
//   const code = tpl
//     .replace('__THREAD_URL__', JSON.stringify(threadUrl))  // from gmail-qa-check
//     .replace('__BODY__',       JSON.stringify(replyBody)); // the reply text
//   await mcp.browser_run_code({ code });
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
