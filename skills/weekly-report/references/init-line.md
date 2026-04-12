# Init: LINE

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

## Login + Setup

1. Call `playwright-login` `browser_navigate` to `https://manager.line.biz` (visible browser)
2. User logs in manually
3. If no LINE Official Account exists → create one via the web UI
4. If Messaging API not enabled → enable it via Settings

## Get Channel Access Token

5. Navigate to Settings → Messaging API → Channel Access Token
6. Issue / copy the long-lived token
7. Save to `.env` as `LINE_CHANNEL_ACCESS_TOKEN`

## Install LINE Bot MCP

8. Run: `claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["-y","@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<token>"}}'`
9. Verify: call `get_message_quota` → returns data → done

**Session saved to `.browser-session/`** — QA skill uses Playwright headless to read incoming messages from OA Manager Chat tab.
