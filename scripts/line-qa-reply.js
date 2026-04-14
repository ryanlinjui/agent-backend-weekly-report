// Reply inside a specific LINE OA chat on `chat.line.biz`.
// Template run via `playwright-cli run-code`.
//
// Runs on the `weekly-report` (headless) session. The session must already
// have LINE Business ID cookies in its --profile — prefer running
// `scripts/line-qa-check.js` first so the SSO handshake and chat URL
// discovery are already settled.
//
// Usage (from the skill):
//   1. Read this file, replace placeholders with JSON.stringify(value):
//        __CHAT_URL__   from line-qa-check
//        __BODY__       the reply text
//   2. Write the substituted code to `.pw-tmp/line-qa-reply.js`.
//   3. Run:
//        playwright-cli --raw -s=weekly-report run-code \
//          --filename=.pw-tmp/line-qa-reply.js
//
// Returns: { sent: true } on success; throws on failure. Rule 8 applies —
// the caller MUST verify the return is exactly { sent: true }.

async (page) => {
  const chatUrl = __CHAT_URL__;
  const body = __BODY__;

  await page.goto(chatUrl);
  await page.waitForTimeout(1500);

  // If chat.line.biz dropped us at the login page (session crossed midnight,
  // rebooted Claude Desktop, etc.) do the silent SSO handshake.
  if (/account\.line\.biz\/login/.test(page.url())) {
    await page.getByRole('button', { name: 'LINE account' }).click().catch(() => {});
    await page.waitForTimeout(3000);
    await page.goto(chatUrl);
    await page.waitForTimeout(1500);
  }

  // Message input — aria-label starts with "Enter: Send message, Shift + Enter: New line".
  const textbox = page.getByRole('textbox', { name: /^Enter:/ });
  await textbox.click();
  await textbox.fill(body);
  await page.waitForTimeout(300);

  // Send button — plain "Send", the only one in the compose footer.
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  // Verify the sent text appears in the conversation within a few seconds.
  // LINE's chat bubbles don't share a stable class name; search by text.
  await page.waitForFunction(
    (expected) => {
      const main = document.querySelector('main');
      return main && main.innerText.includes(expected);
    },
    body,
    { timeout: 10000 }
  );
  return { sent: true };
}
