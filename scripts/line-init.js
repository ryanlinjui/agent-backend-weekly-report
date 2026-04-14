// LINE OA post-creation init — template for Playwright MCP `browser_run_code`.
//
// Prerequisites: the OA already exists (either just created via the unverified
// entry form, or an existing OA the user has chosen to reuse). The browser
// session must be logged in to LINE Business ID (handled in Step 0 Phase 3
// via `playwright-login`).
//
// This template runs the deterministic, scriptable portion of LINE init:
//   Phase A — Click through any pending TOS / notices.
//   Phase B — Enable Messaging API (if currently Disabled), selecting an
//             existing provider or creating a new one.
//   Phase C — Configure Response settings: Chat ON, Greeting OFF, Auto-reply OFF.
//   Phase D — Issue (or read existing) long-lived Channel Access Token
//             from the LINE Developers console.
//
// What's NOT here:
//   • The account-creation form at entry.line.biz — see
//     `scripts/line-create-oa-fill.js`. reCAPTCHA + email signals there make
//     end-to-end automation unreliable, so the skill fills + the user submits.
//   • The initial LINE Business ID login — always user-driven via
//     `playwright-login`.
//
// Usage (from the skill):
//   const tpl = fs.readFileSync('scripts/line-init.js', 'utf8');
//   const code = tpl
//     .replace('__ACCOUNT_ID__',        JSON.stringify(accountId))        // e.g. '@396tyvhm'
//     .replace('__PROVIDER_NAME__',     JSON.stringify(providerName))     // existing provider label, or null
//     .replace('__NEW_PROVIDER_NAME__', JSON.stringify(newProviderName)); // used only when providerName is null
//   await mcp.browser_run_code({ code });
//
// Returns: {
//   accountId, channelId, channelSecret, channelAccessToken,
//   messagingApiEnabled, responseSettings, tokenAction
// }

async (page) => {
  const accountId = __ACCOUNT_ID__;
  const providerName = __PROVIDER_NAME__;
  const newProviderName = __NEW_PROVIDER_NAME__;

  // ───────────────── Phase A — Agree to any pending TOS / notices.
  // Fresh OAs land on /notices/... pages after first login. The agreement
  // button's label varies ("同意", "了解並繼續使用", "I understand...",
  // "Agree") — filter on all known variants.
  await page.goto(`https://manager.line.biz/account/${accountId}`);
  const agreeLabel = /^同意$|^了解並繼續使用|^I understand|^Agree$/;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(500);
    if (!/\/notices\//.test(page.url())) break;
    const btn = page.getByRole('button').filter({ hasText: agreeLabel });
    if ((await btn.count()) === 0) break;
    await btn.first().click();
    await page.waitForTimeout(1200);
  }

  // ───────────────── Phase B — Enable Messaging API if Disabled.
  await page.goto(`https://manager.line.biz/account/${accountId}/setting/messaging-api`);
  await page.waitForTimeout(1500);

  let messagingApiEnabled = await page.evaluate(
    () => /Status\s+Enabled/.test(document.body.innerText)
  );

  if (!messagingApiEnabled) {
    await page.getByRole('button', { name: 'Enable Messaging API' }).click();
    await page.waitForTimeout(800);

    // Provider select modal — radio labels intercept clicks, so click the label.
    if (providerName) {
      await page.locator(`label.custom-control-label:has-text("${providerName}")`).click();
    } else if (newProviderName) {
      // The "New provider" radio is checked by default. Type into its textbox.
      await page.fill('input[placeholder="Enter provider name"]', newProviderName);
    }
    await page.getByRole('button', { name: 'Agree' }).click();
    await page.waitForTimeout(800);

    // Privacy Policy + Terms of Use modal (both optional → OK with empty fields).
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(800);

    // Final confirmation modal — "Enable Messaging API with the following info?"
    await page.getByRole('button', { name: 'OK' }).click();
    await page.waitForTimeout(2500);

    messagingApiEnabled = true;
  }

  // Pull Channel ID + Channel secret from the now-enabled Messaging API page.
  const channelInfo = await page.evaluate(() => {
    const t = document.body.innerText;
    const idMatch = t.match(/Channel ID\s+(\d+)/);
    const secretMatch = t.match(/Channel secret\s+([a-f0-9]+)/);
    return {
      channelId: idMatch?.[1] || null,
      channelSecret: secretMatch?.[1] || null,
    };
  });

  // ───────────────── Phase C — Response settings.
  // Toggle inputs via label clicks (the styled switch intercepts direct input
  // clicks). All three targeted toggles are identified by stable `name` attrs.
  await page.goto(`https://manager.line.biz/account/${accountId}/setting/response`);
  await page.waitForTimeout(800);

  const toggle = async (name, targetChecked) => {
    return await page.evaluate(({ name, targetChecked }) => {
      const input = document.querySelector(`input[name="${name}"]`);
      if (!input) return { name, found: false };
      if (input.checked !== targetChecked) {
        const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        label?.click();
      }
      return { name, found: true };
    }, { name, targetChecked });
  };

  const r1 = await toggle('chatMode', true);
  await page.waitForTimeout(400);
  const r2 = await toggle('welcomeMessage', false);
  await page.waitForTimeout(400);
  // autoResponse is hidden once chatMode is on (mutually exclusive). Toggling
  // is a no-op if the element isn't present — acceptable outcome.
  const r3 = await toggle('autoResponse', false);
  await page.waitForTimeout(800);

  const responseSettings = { chatMode: r1, welcomeMessage: r2, autoResponse: r3 };

  // ───────────────── Phase D — Channel Access Token.
  // Navigate to the channel's Messaging API tab on the Developers console,
  // then issue (first-time) or read (already-issued) the long-lived token.
  if (!channelInfo.channelId) {
    throw new Error(`line-init: could not find Channel ID on Messaging API page for ${accountId}`);
  }
  await page.goto(`https://developers.line.biz/console/channel/${channelInfo.channelId}/messaging-api`);
  await page.waitForTimeout(2000);

  // `developers.line.biz` runs a session separate from `manager.line.biz`.
  // Even when LINE Business ID is authenticated, the Developers console may
  // redirect to the login screen on first visit. Clicking "LINE account"
  // triggers an SSO handshake that completes silently against the existing
  // Business ID cookies — no password re-entry required.
  if (/account\.line\.biz\/login/.test(page.url())) {
    await page.getByRole('button', { name: 'LINE account' }).click().catch(() => {});
    await page.waitForTimeout(3000);
    await page.goto(`https://developers.line.biz/console/channel/${channelInfo.channelId}/messaging-api`);
    await page.waitForTimeout(2000);
  }

  let tokenAction = 'read';
  const issueBtn = page.getByRole('button', { name: /^Issue$/ });
  if ((await issueBtn.count()) > 0) {
    await issueBtn.click();
    await page.waitForTimeout(2500);
    tokenAction = 'issued';
    // If a confirm dialog appears, accept. No-op otherwise.
    const confirmBtn = page.getByRole('button', { name: /^Issue$|^Confirm$|^OK$/ });
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  // Extract the token text. It sits between the "Channel access token
  // (long-lived)" heading and the "Reissue" button. The value itself is the
  // only long base64-ish run in that slice.
  const channelAccessToken = await page.evaluate(() => {
    const t = document.body.innerText;
    const idx = t.indexOf('Channel access token (long-lived)');
    if (idx < 0) return null;
    const slice = t.slice(idx, idx + 500);
    const m = slice.match(/([A-Za-z0-9+/=]{100,})/);
    return m ? m[1] : null;
  });

  return {
    accountId,
    channelId: channelInfo.channelId,
    channelSecret: channelInfo.channelSecret,
    channelAccessToken,
    messagingApiEnabled,
    responseSettings,
    tokenAction,
  };
}
