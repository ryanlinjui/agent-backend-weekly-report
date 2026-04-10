# Send Report via Email

Send the approved report using Computer Use MCP to control macOS Mail.app.

## Why Mail.app (not Chrome/Gmail web)

Chrome DevTools MCP opens an isolated browser session — Google blocks it as "insecure automation browser". Mail.app is a native macOS app with full Computer Use MCP access and the sender account already configured.

## Prerequisites
- Computer Use MCP must be connected (`mcp__computer-use__*` tools)
- Mail.app must have the sender email account configured (check `.env` for `GMAIL_USER`)
- Must request access to Mail.app via `request_access` before first use

## Steps

### 1. Request access
Call `request_access` for Mail.app.

### 2. Open Mail.app and compose
- `open_application` → "Mail"
- Use keyboard shortcut `key` → `Cmd+N` to create new message
- `screenshot` to verify compose window

### 3. Fill fields
- Click/type into **To** field → `{REPORT_RECIPIENTS}` from `.env`
- Click/type into **Subject** field → `Weekly Report — {W_start} to {W_end}`
- Click/type into **Body** → the clean plain-text version of the draft

### 4. Send
- `key` → `Cmd+Shift+D` (Send in Mail.app)
- Or click the Send button

### 5. Verify
- `screenshot` to confirm message was sent (compose window closes)

On success: print `✅ Email sent to {REPORT_RECIPIENTS}`
On failure: print error + `❌ Email send failed.`

## Fallback

If Computer Use MCP is not available, skip email with: `⚠️ Computer Use MCP not available. Skipping email.`
