# Init: Email (IMAP/SMTP)

> **Rule:** NEVER ask the user to choose or make decisions. Try every approach automatically. If one fails, silently try the next. Only pause when user must physically act (password, SMS, /mcp). After they act, immediately continue.

## Check

Test SMTP with `scripts/email-client.py`. If OK → ✅. If auth error → needs App Password. If `EMAIL_USER` empty → ask user for email address (the ONLY question allowed).

## Browser tool fallback chain — MANDATORY

When you need to open a URL, you MUST try ALL available browser tools before giving manual instructions. Tool names vary by environment (plugin prefix, standalone, etc.) — **do NOT hardcode tool names.** Instead:

### How to find and try browser tools

1. Use `ToolSearch` to find available browser tools: search for `navigate` or `browser_navigate` or `navigate_page`
2. Try EVERY browser tool found, in this priority order:
   - **Chrome DevTools** tools (names containing `chrome-devtools` + `navigate_page`)
   - **Playwright login** tools (names containing `playwright-login` or `playwright` without `headless` + `browser_navigate`)
   - **Playwright headless** tools (names containing `playwright-headless` + `browser_navigate`)
   - **Claude in Chrome** tools (names containing `Claude_in_Chrome` + `navigate`)
3. **ONLY after ALL browser tools have been tried and failed** → tell user to open URL manually

### Rules
- **NEVER stop after the first tool fails.** Try the next one immediately.
- **NEVER show manual instructions without trying ALL available browser tools first.**
- **NEVER ask user "which browser tool should I use?"** — just try them all silently.
- After one succeeds, use the same tool family for subsequent actions (click, type, snapshot).

### Headed vs headless
- **Login page (user must type password)** → use headed/visible browser (Playwright login or Chrome DevTools)
- **ALL other pages (post-login automation)** → use **headless** browser. User should NOT see any browser window for automated steps like navigating to 2FA settings, creating App Password, reading the generated password, etc.

## Init steps

### 1. Open login page

Do NOT ask for email address. Open the provider's App Password page directly using the **browser fallback chain**:
- Google: `https://myaccount.google.com/apppasswords`
- Outlook: `https://account.live.com/proofs/AppPassword`
- Yahoo: `https://login.yahoo.com/myc/security`
- iCloud: `https://appleid.apple.com/account/manage`

If `EMAIL_USER` is already in `.env`, detect provider from its domain. If not, default to Google (most common).

The page will redirect to login. Print: `🌐 Login page opened. Please log in, then say "ok".`
**Wait for "ok".** Login page = hands off.

### 2. Extract email address from logged-in session

After user logs in, take a browser snapshot of the account page. Extract the email address from the page content (e.g., "Logged in as user@example.com" or visible in the account header).

Save to `.env` as `EMAIL_USER`. Detect provider from domain (check MX for Google Workspace: `dig MX {domain} +short | grep -q google`).

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

### 6. Ask who to send to

If `REPORT_RECIPIENTS` empty in `.env`:
```
Weekly report will be sent from {EMAIL_USER}. Who should receive it? (email addresses, comma-separated)
```
This is the ONLY question asked during email init. Save to `.env`.

Print: `✅ Email configured. Sender: {EMAIL_USER}, Recipients: {REPORT_RECIPIENTS}`

## User interaction

- Login (once) — skill extracts email address automatically after login
- Phone verification (once, if 2FA not enabled)
- Who to send to (once) — the ONLY question asked
- Everything else: skill auto-drives
