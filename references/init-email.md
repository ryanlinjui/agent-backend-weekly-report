# Init: Email (IMAP/SMTP)

> **Rule:** Do NOT ask the user to choose approaches or skip services. Try each approach automatically. If one fails, try the next. Only stop for physical user interaction (login, password, SMS, /mcp connect).

## Check

```bash
source .env
python3 scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "init test" \
  --body-file <(echo "test")
```

- If returns `OK` → ✅ already initialized.
- If auth error → ❌ needs App Password.
- If `EMAIL_USER` empty → ❌ needs full init.

## Init steps

### 1. Ask for email address (if not in .env)

If `EMAIL_USER` is empty:
```
What email address should the report be sent from?
```
Wait for user to provide email. Save to `.env` as `EMAIL_USER`.

### 2. Detect provider

Auto-detect from email domain:

| Domain | Provider | Login URL |
|---|---|---|
| gmail.com / Google Workspace | Google | `https://myaccount.google.com/apppasswords` |
| outlook.com / hotmail.com | Microsoft | `https://account.live.com/proofs/AppPassword` |
| yahoo.com | Yahoo | `https://login.yahoo.com/myc/security` |
| icloud.com / me.com | Apple | `https://appleid.apple.com/account/manage` |

For Google Workspace domains, check MX record:
```bash
dig MX {domain} +short | grep -q google
```

### 3. Open App Password page via Playwright

Use `playwright-login` (headed — visible browser):

```
Playwright: browser_navigate → {provider App Password URL}
```

If redirected to login page:
```
🌐 Login page opened. Please log in and complete any verification, then say "ok".
```
**Wait for "ok".** Login page = hands off. Do NOT fill any fields.

### 4. Enable 2FA if needed (Google only)

After login, `browser_snapshot` to check page.

If on "2FA not enabled" page:
```
Playwright: browser_navigate → https://myaccount.google.com/signinoptions/two-step-verification
Playwright: browser_snapshot → check if 2FA is ON
```

- If OFF → skill clicks "Turn on" → navigates to phone setup
- Phone number input → **STOP**: `📱 Enter phone number and verify, then say "ok".` → wait
- After verify → skill clicks "Turn on 2-Step Verification" → confirm ON

### 5. Create App Password (fully automated)

```
Playwright: browser_navigate → {App Password URL}
Playwright: browser_snapshot → find input field
Playwright: browser_type → "weekly-report" in App name field
Playwright: browser_click → Create button
Playwright: browser_snapshot → read the generated password from page
```

**No user interaction.** Skill reads the password directly.

### 6. Save + verify

Save to `.env` as `EMAIL_PASSWORD`.

```bash
python3 scripts/email-client.py send \
  --to "$EMAIL_USER" --subject "Weekly Report — email configured" \
  --body-file <(echo "If you see this, email is working.")
```

If OK → proceed to step 7.
If fail → retry from step 5.

### 7. Confirm recipients

If `REPORT_RECIPIENTS` is empty in `.env`:
```
Who should receive the weekly report by email? (comma-separated addresses)
```
Save to `.env` as `REPORT_RECIPIENTS`.

### 8. Verify recipients are valid

For each address in `REPORT_RECIPIENTS`, verify the format is valid (contains `@`, has domain). Do NOT send any actual email during init.

SMTP auth was already verified in step 6 — if that passed, sending will work.

Print: `✅ Email configured. Recipients: {REPORT_RECIPIENTS}`

## User interaction

- Login page: user types password + 2FA (once)
- Phone verification: user enters phone number (once, if 2FA not enabled)
- Provide recipient email addresses (once)
- Everything else: skill auto-drives
