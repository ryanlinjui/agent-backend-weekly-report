# Send Report via Email

Send the approved report via Gmail using Chrome DevTools MCP.

## Prerequisites
- Chrome DevTools MCP must be connected
- User must be logged into Gmail in their Chrome browser

## Steps

1. `navigate_page` → `https://mail.google.com/mail/u/0/#inbox?compose=new`
2. `take_snapshot` to confirm compose window appeared
3. `fill` or `click` the **To** field → type each address from `REPORT_RECIPIENTS`
4. `fill` the **Subject** field → `Weekly Report — {W_start} to {W_end}`
5. `fill` the **Message Body** → the clean plain-text version of the draft
6. `click` the **Send** button

## Result

On success: print `✅ Email sent to {REPORT_RECIPIENTS}`
On failure: print error + `❌ Email send failed.`

## Fallback

If Chrome DevTools MCP is not connected, skip with: `⚠️ Chrome DevTools MCP not available. Skipping email.`
