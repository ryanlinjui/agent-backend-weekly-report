# Init: LINE

**Use Playwright MCP only.** Tools are in the deferred tools list — just call them directly. Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

If LINE Bot MCP tools not available or `LINE_CHANNEL_ACCESS_TOKEN` empty:

1. Call `playwright-login` `browser_navigate` to open LINE Developers Console (visible browser — user logs in)
2. After login, use `playwright-headless` for all remaining steps. Create LINE Official Account if none exists
3. Enable Messaging API
4. Issue Channel Access Token → save to `.env`
5. Install LINE Bot MCP: `claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["-y","@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<token>"}}'`
6. Start webhook: `python3 scripts/line-webhook.py &` + `cloudflared tunnel --url http://localhost:8765`
7. Set webhook URL via LINE API
8. Verify: `get_message_quota` returns data → ✅
