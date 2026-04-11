# Send Report via LinkedIn

Send the weekly report as LinkedIn DM to specified recipients using LinkedIn MCP.

## Prerequisites
- LinkedIn MCP must be connected (`mcp__linkedin__*` tools available)
- First-time use: LinkedIn MCP opens a browser for login. User logs in once, session persists in `~/.linkedin-mcp`
- `LINKEDIN_RECIPIENTS` in `.env` — comma-separated LinkedIn profile URLs or names

## Steps

### 1. Send to each recipient

For each recipient in `LINKEDIN_RECIPIENTS`:

Use `mcp__linkedin__send_message` to send the clean plain-text version of the report.

If the recipient is specified by name, first use `mcp__linkedin__search_people` to find their profile, then send.

### 2. Result

On success: print `✅ LinkedIn DM sent to {recipient}`
On failure: print error, continue to next recipient.

## LinkedIn QA (inbound)

Use `mcp__linkedin__get_inbox` and `mcp__linkedin__get_conversation` to check for replies to the report. Same grounding rules as email/LINE QA.

## Fallback

If LinkedIn MCP is not connected, skip with: `⚠️ LinkedIn MCP not available. Skipping LinkedIn delivery.`

## First-time login

LinkedIn MCP uses Patchright (Playwright fork) with persistent browser profiles. On first use:
1. MCP opens a browser window for LinkedIn login
2. User logs in (handles 2FA if needed)
3. Session saved to `~/.linkedin-mcp` — no re-login needed

This is automatic — no manual setup required.
