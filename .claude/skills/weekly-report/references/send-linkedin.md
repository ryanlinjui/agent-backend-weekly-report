# Send Report via LinkedIn DM

Send the weekly report as LinkedIn DM using Playwright to operate LinkedIn web.

## Why Playwright (not LinkedIn MCP send_message)

LinkedIn MCP's `send_message` has a known bug (composer_unavailable, GitHub issue #344). Playwright directly operating LinkedIn web is reliable and tested.

## Prerequisites
- `playwright-login` or `playwright-headless` MCP connected
- User must have logged into LinkedIn via `playwright-login` at least once (session persists in `.browser-session/`)
- `LINKEDIN_RECIPIENTS` in `.env` — comma-separated LinkedIn profile URLs

## Steps

### 1. Get recipient profile URN

For each recipient URL in `LINKEDIN_RECIPIENTS`, extract the username (e.g., `takalawang` from `https://www.linkedin.com/in/takalawang/`).

Use LinkedIn MCP to get the profile URN:
```
LinkedIn MCP: get_person_profile → linkedin_username
→ extract profile_urn (e.g., ACoAAD1LUtAB1e5fY_YuC3JaUT_tsBHVMGyDY_8)
```

### 2. Open compose page

```
Playwright: browser_navigate → https://www.linkedin.com/messaging/compose/?recipient={profile_urn}
```

Use `playwright-headless` for automated sends (invisible). Use `playwright-login` only if login is needed.

### 3. Type and send

```
Playwright: browser_snapshot → find "Write a message…" textbox
Playwright: browser_click → click the textbox
Playwright: browser_type → type the clean plain-text report
Playwright: browser_click → click "Send" button
```

### 4. Verify

If URL changes to `messaging/thread/...` → message sent successfully.

On success: print `✅ LinkedIn DM sent to {recipient}`
On failure: print error, continue to next recipient.

## First-time login

If Playwright shows LinkedIn login page:
1. Switch to `playwright-login` (headed/visible)
2. User logs in
3. Session saved to `.browser-session/` — persists across sessions
4. Switch back to `playwright-headless` for automated operations

## LinkedIn QA (inbound)

Use LinkedIn MCP `get_inbox` and `get_conversation` to check for replies. If a reply contains a question, compose a grounded answer and send via Playwright (same flow as above).

## Fallback

If neither Playwright nor LinkedIn MCP can send, skip with: `⚠️ LinkedIn not available. Skipping LinkedIn delivery.`
