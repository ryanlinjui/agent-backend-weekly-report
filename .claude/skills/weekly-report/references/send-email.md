# Send Report via Email

Send the approved report using IMAP/SMTP — works with any email provider.

## Prerequisites
- `EMAIL_USER` and `EMAIL_PASSWORD` (App Password) in `.env`
- IMAP/SMTP hosts auto-detected from email domain (Gmail, Outlook, Yahoo, iCloud, etc.)
- Override with `EMAIL_IMAP_HOST` / `EMAIL_SMTP_HOST` in `.env` if needed
- Python 3 stdlib only — zero pip dependencies

## Steps

### 1. Write draft to temp file

Use the Write tool to save the clean plain-text draft to `/tmp/weekly-report-body.txt`.

### 2. Send

```bash
source .env
python3 .claude/skills/weekly-report/scripts/email-client.py send \
  --to "{REPORT_RECIPIENTS}" \
  --subject "Weekly Report — {W_start} to {W_end}" \
  --body-file /tmp/weekly-report-body.txt
```

### 3. Result

On `OK` → print `✅ Email sent to {REPORT_RECIPIENTS}`
On error → print the error + `❌ Email send failed.`

### 4. Clean up

```bash
rm -f /tmp/weekly-report-body.txt
```

## Auto-detection

The script auto-detects IMAP/SMTP servers from the email domain:

| Domain | IMAP | SMTP |
|---|---|---|
| gmail.com | imap.gmail.com:993 | smtp.gmail.com:587 |
| outlook.com / hotmail.com | outlook.office365.com:993 | smtp.office365.com:587 |
| yahoo.com | imap.mail.yahoo.com:993 | smtp.mail.yahoo.com:465 |
| icloud.com / me.com | imap.mail.me.com:993 | smtp.mail.me.com:587 |
| other | imap.{domain}:993 | smtp.{domain}:587 |

## Fallback

If SMTP fails (auth error), the script prints a helpful message about using App Passwords.
On macOS, fallback to osascript + Mail.app if SMTP is unavailable.
