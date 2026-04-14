// Fill the LINE Official Account creation form.
// Template for the Playwright MCP `browser_run_code` tool.
//
// This template does NOT click the submit button — LINE's entry form is
// gated by reCAPTCHA v3 (usually silent) plus server-side anti-automation.
// Clicking submit programmatically right after fill works sometimes, but
// occasionally triggers a visible challenge. After filling, either:
//   • The skill clicks `button[type="submit"]` and waits for the URL to
//     progress to `/confirmation` — then clicks 完成 on the review page.
//   • If a reCAPTCHA challenge appears, hand control back to the user.
//
// Usage (from the skill):
//   const tpl = fs.readFileSync('scripts/line-create-oa-fill.js', 'utf8');
//   const code = tpl
//     .replace('__ACCOUNT_NAME__',  JSON.stringify(accountName))   // ≤ 20 chars, displayed in users' chat list
//     .replace('__EMAIL__',         JSON.stringify(email))
//     .replace('__COMPANY_NAME__',  JSON.stringify(companyName))   // ≤ 100 chars
//     .replace('__COUNTRY__',       JSON.stringify(country))       // e.g. '台灣'; pass null to keep default
//     .replace('__INDUSTRY_MAIN__', JSON.stringify(industryMain))  // e.g. '網站＆部落格'
//     .replace('__INDUSTRY_SUB__',  JSON.stringify(industrySub));  // label string, or null → pick first valid
//   await mcp.browser_run_code({ code });
//
// Returns: { filled: true, industrySubSelected: <label> }

async (page) => {
  const accountName = __ACCOUNT_NAME__;
  const email = __EMAIL__;
  const companyName = __COMPANY_NAME__;
  const country = __COUNTRY__;
  const industryMain = __INDUSTRY_MAIN__;
  const industrySub = __INDUSTRY_SUB__;

  await page.goto('https://entry.line.biz/form/entry/unverified');

  // Field names are stable across LINE UI revisions — anchor to `name`.
  await page.fill('input[name="bot.name"]', accountName);
  await page.fill('input[name="account.email"]', email);
  await page.fill('input[name="account.name"]', companyName);

  if (country) {
    await page.selectOption('select[name="legalCountryCode"]', { label: country });
  }

  // Industry main triggers sub dropdown population — wait before picking sub.
  await page.selectOption('select[name="category_group"]', { label: industryMain });
  await page.waitForTimeout(500);

  let industrySubSelected = null;
  if (industrySub) {
    await page.selectOption('select[name="category"]', { label: industrySub });
    industrySubSelected = industrySub;
  } else {
    // Pick the first non-disabled option when caller doesn't specify.
    // `page.evaluate` can only return serializable values — return a plain
    // object, not the HTMLOptionElement itself.
    const firstValid = await page.evaluate(() => {
      const sel = document.querySelector('select[name="category"]');
      if (!sel) return null;
      const opt = [...sel.options].find(o => !o.disabled && o.value);
      return opt ? { value: opt.value, label: opt.textContent } : null;
    });
    if (firstValid) {
      await page.selectOption('select[name="category"]', firstValid.value);
      industrySubSelected = firstValid.label;
    }
  }

  return { filled: true, industrySubSelected };
}
