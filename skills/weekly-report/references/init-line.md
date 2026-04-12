# Init: LINE

If LINE Bot MCP tools not available or `LINE_CHANNEL_ACCESS_TOKEN` empty:

1. Open LINE Developers Console with Playwright (headless after login)
2. Create LINE Official Account if none exists
3. Enable Messaging API
4. Issue Channel Access Token → save to `.env`
5. Install LINE Bot MCP: `claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["-y","@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<token>"}}'`
6. Start webhook: `python3 scripts/line-webhook.py &` + `cloudflared tunnel --url http://localhost:8765`
7. Set webhook URL via LINE API
8. Verify: `get_message_quota` returns data → ✅
