# Init: LINE

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or any other browser tool.

If LINE Bot MCP tools not available or `LINE_CHANNEL_ACCESS_TOKEN` empty:

1. Use `ToolSearch("playwright")` to load Playwright tools
2. Open LINE Developers Console with Playwright (headless after login)
3. Create LINE Official Account if none exists
4. Enable Messaging API
5. Issue Channel Access Token → save to `.env`
6. Install LINE Bot MCP: `claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["-y","@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<token>"}}'`
7. Start webhook: `python3 scripts/line-webhook.py &` + `cloudflared tunnel --url http://localhost:8765`
8. Set webhook URL via LINE API
9. Verify: `get_message_quota` returns data → ✅
