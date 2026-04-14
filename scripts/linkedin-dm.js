// Send a LinkedIn DM — template run via `playwright-cli run-code`.
//
// How the skill uses this file:
//   1. Read this file, replace __PROFILE_URL__ and __MESSAGE__ with JSON-encoded
//      string literals (use JSON.stringify to escape quotes/unicode safely).
//   2. Write the substituted code to `.pw-tmp/linkedin-dm.js` (must live under
//      the project cwd — `run-code --filename` sandboxes to the cwd).
//   3. Run:
//        playwright-cli --raw -s=weekly-report run-code \
//          --filename=.pw-tmp/linkedin-dm.js
//      Stdout is the return value as JSON. Verify it is `{ "sent": true }`.
//   4. The `weekly-report` session must already be open and logged in to
//      LinkedIn (handled by Step 0 Phase 3 via `weekly-report-login`).

async (page) => {
  const profileUrl = __PROFILE_URL__;
  const message = __MESSAGE__;

  await page.goto(profileUrl);

  // Close any leftover conversation bubbles from a previous recipient
  // (LinkedIn stacks compose windows at the bottom; new ones can end up
  // off-screen if the old ones aren't dismissed first).
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await page
    .getByTestId('lazy-column')
    .getByRole('link', { name: 'Message', exact: true })
    .click();

  const msgBox = page
    .getByRole('textbox', { name: 'Write a message…' })
    .last();
  // `force: true` bypasses Playwright's viewport check in case the compose
  // dialog is anchored outside the visible area.
  await msgBox.click({ force: true });
  await msgBox.fill(message);

  await page
    .getByRole('button', { name: 'Send', exact: true })
    .last()
    .click({ force: true });

  // Give LinkedIn a moment to flush the send.
  await page.waitForTimeout(1500);

  // Dismiss the compose bubble so subsequent recipients aren't pushed
  // off-screen. Best-effort — LinkedIn sometimes auto-closes it, in which
  // case the locator won't match and we just move on.
  await page
    .getByRole('button', { name: 'Close your conversation with' })
    .last()
    .click({ force: true })
    .catch(() => {});
}

