// List unread Gmail threads that look like replies to a weekly report.
// Template for the Playwright MCP `browser_run_code` tool.
//
// Runs on `playwright-headless` (the MCP session must already be logged in
// to Gmail via Step 0 Phase 3).
//
// Usage (from the skill):
//   const tpl = fs.readFileSync('scripts/gmail-qa-check.js', 'utf8');
//   const code = tpl
//     .replace('__SUBJECT_FILTER__', JSON.stringify(subjectFilter))  // e.g. 'Weekly Report'
//     .replace('__NEWER_THAN__',     JSON.stringify(newerThan));     // e.g. '1d', '30m', '2h'
//   await mcp.browser_run_code({ code });
//
// Returns: {
//   threads: [{ threadId, threadUrl, from, subject, bodyPreview }, ...]
// }
// `threadId` is the Gmail conversation id from the URL after opening the
// thread. `threadUrl` can be passed directly to scripts/gmail-qa-reply.js.

async (page) => {
  const subjectFilter = __SUBJECT_FILTER__;
  const newerThan = __NEWER_THAN__;

  // Build the Gmail search query: is:unread + subject contains filter + recent
  const q = [
    'is:unread',
    `newer_than:${newerThan}`,
    `subject:(${subjectFilter})`,
  ].join('+');
  await page.goto(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(q).replace(/%2B/g, '+')}`);
  await page.waitForTimeout(2500);

  // Collect row metadata up front (before navigating into threads).
  const rows = await page.evaluate(() => {
    return [...document.querySelectorAll('tr.zA')].map((tr, index) => ({
      index,
      domId: tr.id,
      subject: tr.querySelector('.bqe, .bog')?.innerText || '',
      from: [...tr.querySelectorAll('span[email]')].map(e => e.getAttribute('email'))[0] || '',
      snippet: tr.querySelector('.y2')?.innerText?.slice(0, 200) || '',
    }));
  });

  // For each row: click to open → capture URL (holds thread id) → go back.
  // Gmail's list rows can resolve off-screen in dense inboxes; trigger the
  // click via direct DOM call so we bypass Playwright's viewport gate.
  const threads = [];
  for (let i = 0; i < rows.length; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('tr.zA')[idx]?.click();
    }, i);
    await page.waitForTimeout(1200);

    const threadUrl = page.url();
    const threadIdMatch = threadUrl.match(/\/([A-Za-z0-9]{15,})(?:\?|$)/);

    // Snapshot the latest message body on the opened thread.
    const body = await page.evaluate(() => {
      const bodies = [...document.querySelectorAll('.a3s.aiL, .ii.gt .a3s')];
      return bodies[bodies.length - 1]?.innerText?.slice(0, 1500) || '';
    });

    threads.push({
      threadId: threadIdMatch?.[1] || null,
      threadUrl,
      from: rows[i].from,
      subject: rows[i].subject,
      bodyPreview: body,
    });

    // Back to the search result list for the next iteration.
    await page.goBack();
    await page.waitForTimeout(900);
  }

  return { threads };
}
