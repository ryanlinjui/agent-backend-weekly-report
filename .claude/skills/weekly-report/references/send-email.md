# Send Report via Email

Send the approved report using osascript to control macOS Mail.app via Bash tool.

## Prerequisites
- macOS with Mail.app configured (sender account matching `GMAIL_USER` in `.env`)
- No MCP needed — uses Bash tool + osascript only

## Steps

### 1. Write draft to temp file

Use the Write tool to save the clean plain-text draft to `/tmp/weekly-report-body.txt`.

### 2. Send via osascript

Run via Bash:

```bash
SUBJECT="Weekly Report — {W_start} to {W_end}"
TO="{REPORT_RECIPIENTS}"
SENDER="{GMAIL_USER}"
BODY=$(cat /tmp/weekly-report-body.txt)

osascript <<APPLESCRIPT
tell application "Mail"
    set newMessage to make new outgoing message with properties {subject:"$SUBJECT", sender:"$SENDER", visible:false}
    set content of newMessage to "$BODY"
    tell newMessage
        make new to recipient at end of to recipients with properties {address:"$TO"}
    end tell
    send newMessage
end tell
APPLESCRIPT
```

**Note:** For multi-line body with special characters, write the body to a temp file first, then read it in the osascript via `do shell script "cat /tmp/weekly-report-body.txt"`.

### 3. Verify

On success (osascript exits 0): print `✅ Email sent to {REPORT_RECIPIENTS}`
On failure: print stderr + `❌ Email send failed.`

### 4. Clean up

```bash
rm -f /tmp/weekly-report-body.txt
```

## Fallback

If osascript fails (Mail.app not configured, permission denied), skip email with warning.
