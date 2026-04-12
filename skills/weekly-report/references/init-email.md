# Init: Email (IMAP/SMTP)

> **Rule:** NEVER ask the user to choose or make decisions. Try every approach automatically. If one fails, silently try the next. Only pause when user must physically act (password, SMS, /mcp). After they act, immediately continue.

## Check

Test SMTP with `scripts/email-client.py`. If OK → ✅. If auth error → needs App Password. If `EMAIL_USER` empty → ask user for email address (the ONLY question allowed).

## Browser tool fallback chain

For ALL browser operations in this init, try tools in this order. **Do NOT stop if the first tool fails — silently try the next:**

1. **Chrome DevTools MCP** (`navigate_page`, `click`, `fill`, `take_snapshot`)
2. **Playwright login** (`playwright-login` — headed, visible browser)
3. **Playwright headless** (`playwright-headless` — if no login needed)

If ALL three fail → tell user which URL to open manually, but still try to automate everything else.

## Init steps

### 1. Get email address

If `EMAIL_USER` empty in `.env`, ask: `What email address should the report be sent from?`
Save to `.env`. Detect provider from domain (check MX for Google Workspace: `dig MX {domain} +short | grep -q google`).

### 2. Open App Password page

Using the **browser fallback chain above**, navigate to the provider's App Password URL:
- Google: `https://myaccount.google.com/apppasswords`
- Outlook: `https://account.live.com/proofs/AppPassword`
- Yahoo: `https://login.yahoo.com/myc/security`
- iCloud: `https://appleid.apple.com/account/manage`

If redirected to login: `🌐 Login page opened. Please log in, then say "ok".`
**Wait for "ok".** Login page = hands off.

### 3. Enable 2FA if needed (Google)

After login, take snapshot to check page. If 2FA is off:
- Navigate to `https://myaccount.google.com/signinoptions/two-step-verification`
- Skill clicks "Turn on" / navigates to phone setup
- Phone number input → `📱 Enter phone number and verify, then say "ok".` → wait
- After verify → skill clicks "Turn on 2-Step Verification"

### 4. Create App Password (fully automated)

Navigate to App Password page → snapshot → fill "weekly-report" → click Create → snapshot → **read the 16-character password from the page**.

No user interaction. Skill reads the password directly.

### 5. Save + verify

Save to `.env` as `EMAIL_PASSWORD`. Test SMTP. If fail → retry from step 4.

### 6. Confirm recipients

If `REPORT_RECIPIENTS` empty: ask user for email addresses. Save to `.env`. Verify format. Do NOT send actual email during init.

Print: `✅ Email configured.`

## User interaction

- Email address (once, if not in .env)
- Login (once, password + 2FA)
- Phone verification (once, if 2FA not enabled)
- Recipient addresses (once)
- Everything else: skill auto-drives using browser fallback chain
