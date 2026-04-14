// List LINE OA chats from the sidebar of `chat.line.biz`.
// Template run via `playwright-cli run-code`.
//
// Runs on the `weekly-report` (headless) session. The session must already
// have LINE Business ID cookies in its --profile. `chat.line.biz` uses an
// OAuth session separate from `manager.line.biz`, and will redirect to the
// login page on first visit. The template clicks the `LINE account` SSO
// button to complete the handshake silently against the existing Business
// ID cookies (same trick as `scripts/line-init.js`).
//
// Usage (from the skill):
//   1. Read this file, replace the placeholder with JSON.stringify(value):
//        __ACCOUNT_ID__   e.g. '@909aheti'
//   2. Write the substituted code to `.pw-tmp/line-qa-check.js`.
//   3. Run:
//        playwright-cli --raw -s=weekly-report run-code \
//          --filename=.pw-tmp/line-qa-check.js
//
// Returns: {
//   oaUserId,            // internal LINE user id of the OA (e.g. 'U08...') — used to build chat URLs
//   chats: [{ userName, lastMessage, timestamp, chatUrl }, ...]
// }
// `chatUrl` is the direct link to that chat, suitable for
// `scripts/line-qa-reply.js`.

async (page) => {
  const accountId = __ACCOUNT_ID__;

  await page.goto(`https://chat.line.biz/account/${accountId}`);
  await page.waitForTimeout(2000);

  // SSO handshake if chat.line.biz redirected to the Business ID login.
  if (/account\.line\.biz\/login/.test(page.url())) {
    await page.getByRole('button', { name: 'LINE account' }).click().catch(() => {});
    await page.waitForTimeout(3000);
    await page.goto(`https://chat.line.biz/account/${accountId}`);
    await page.waitForTimeout(2500);
  }

  // After redirect the URL settles to `chat.line.biz/<oaUserId>`.
  const oaUserId = page.url().split('/').filter(Boolean).pop();

  // Sidebar chat rows. LINE's UI is Vue without data-* attrs on rows, so we
  // anchor on the bootstrap class pattern and the heading inside each row.
  // We iterate by clicking each row to capture its chat URL (the user id is
  // only exposed via the SPA route change).
  const rowCount = await page.evaluate(() => {
    return document.querySelectorAll('a.list-group-item-action.list-group-item-chat, .list-group-item-chat a[href="#"]').length
        || document.querySelectorAll('a[href="#"]:has(h6)').length;
  });

  const chats = [];
  for (let i = 0; i < rowCount; i++) {
    // Up-front snapshot of the row's text (name / preview / timestamp).
    const rowInfo = await page.evaluate((idx) => {
      const rows = document.querySelectorAll('a[href="#"]:has(h6)');
      const row = rows[idx];
      if (!row) return null;
      return {
        userName: row.querySelector('h6')?.innerText?.trim() || '',
        lastMessage: [...row.querySelectorAll('h6 ~ *')]
          .map(el => el.innerText?.trim())
          .filter(Boolean)
          .find(t => t.length > 0) || '',
        timestamp: row.querySelector('[class*="time"], [class*="Time"]')?.innerText?.trim() || '',
      };
    }, i);
    if (!rowInfo) continue;

    // Click to reveal the chat URL, then return.
    await page.evaluate((idx) => {
      document.querySelectorAll('a[href="#"]:has(h6)')[idx]?.click();
    }, i);
    await page.waitForTimeout(1000);

    chats.push({ ...rowInfo, chatUrl: page.url() });
  }

  return { oaUserId, chats };
}
