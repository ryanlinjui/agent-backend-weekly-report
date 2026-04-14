// Send a Gmail email — template for the Playwright MCP `browser_run_code` tool.
//
// How the skill uses this file:
//   1. Read this file, replace __TO__, __SUBJECT__, __BODY__ with JSON-encoded
//      string literals (use JSON.stringify to escape quotes/unicode/newlines).
//   2. Call mcp__playwright-headless__browser_run_code with the resulting code.
//   3. The MCP session must already be logged into Gmail
//      (handled by Step 0 Phase 3 of the skill via playwright-login).
//
// Usage example (from the skill):
//   const tpl = fs.readFileSync('scripts/gmail-send.js', 'utf8');
//   const code = tpl
//     .replace('__TO__',      JSON.stringify(toAddr))
//     .replace('__SUBJECT__', JSON.stringify(subject))
//     .replace('__BODY__',    JSON.stringify(body));
//   await mcp.browser_run_code({ code });
//
// `to` accepts a string (single address or comma-separated list) or an array
// — all normalize to individual recipient chips. For privacy-sensitive
// broadcasts, the skill should loop and call this template ONCE PER RECIPIENT
// so no recipient sees anyone else's address, and sends stay out of the
// Gmail BCC-broadcast spam heuristic.

async (page) => {
  const to = __TO__;
  const subject = __SUBJECT__;
  const body = __BODY__;

  const recipients = (Array.isArray(to) ? to : String(to).split(','))
    .map(s => s.trim())
    .filter(Boolean);
  if (!recipients.length) {
    throw new Error('gmail-send: no recipients provided in `to`.');
  }

  await page.goto('https://mail.google.com/mail/u/0/#inbox');

  // Gmail SPA can take a moment to render the Compose button on a cold load.
  const composeBtn = page.getByRole('button', { name: /^Compose$/i }).first();
  await composeBtn.waitFor({ state: 'visible', timeout: 15000 });
  await composeBtn.click();

  // Scope all subsequent selectors to the newly opened compose dialog in case
  // leftover drafts from a previous run are still docked.
  const dialog = page.locator('[role="dialog"]').last();

  // To — fill each recipient separately and commit with Tab. Filling a single
  // comma-separated string only creates a chip for the first address; the rest
  // get silently dropped.
  const toBox = dialog.getByRole('combobox', { name: 'To recipients' });
  await toBox.click();
  for (const email of recipients) {
    await toBox.fill(email);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(150);
  }

  // Subject
  const subjectBox = dialog.getByRole('textbox', { name: 'Subject' });
  await subjectBox.click();
  await subjectBox.fill(subject);

  // Body — target the contenteditable DIV explicitly. A hidden <textarea>
  // also carries aria-label="Message Body", and the generic role locator
  // will pick it, leaving the visible editor empty.
  const bodyBox = dialog.locator('div[role="textbox"][aria-label="Message Body"]');
  await bodyBox.click();
  await bodyBox.fill(body);

  // Send button — aria-label is `Send ‪(⌘Enter)‬` with invisible bidi marks,
  // so match by prefix rather than exact string.
  await dialog.getByRole('button', { name: /^Send/ }).first().click();

  // Confirm the send landed. "Message sent" toast appears within a few seconds.
  await page.getByText(/Message sent/i).waitFor({ timeout: 10000 });
  return { sent: true };
}
