# Init: LINE

LINE requires two things: LINE Bot MCP (for sending) and webhook (for receiving QA questions).

> **Rule:** NEVER ask the user to choose or make decisions. Try every approach automatically. If one fails, silently try the next. Only pause when user must physically act (password, SMS, /mcp). After they act, immediately continue.
> **Claude Desktop:** No terminal available. Use tool calls and file edits instead of Bash/CLI. For MCP install, edit `~/Library/Application Support/Claude/claude_desktop_config.json`.

## Browser tool fallback chain

For ALL browser operations, try in order (do NOT stop if one fails):
1. **Chrome DevTools MCP** (navigate_page, click, fill, take_snapshot)
2. **Playwright login** (playwright-login — headed, visible)
3. **Playwright headless** (playwright-headless — invisible)
If ALL fail → tell user the URL, but keep trying to automate.
## Check

### LINE Bot MCP
Are `mcp__line-bot__*` tools available?

- If yes → test:
  ```
  LINE Bot MCP: get_message_quota
  ```
  If returns data → ✅ LINE Bot MCP working.

### LINE Webhook
```bash
curl -s http://localhost:8765
```
- If returns `ok` → ✅ webhook server running.
- If fails → ❌ needs init.

Also check webhook is registered:
```bash
curl -s "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN"
```
- If `"active": true` → ✅
- If `"active": false` or endpoint mismatch → ❌ needs re-register.

## Init steps

### Part A: LINE Bot MCP

#### 1. Check if LINE_CHANNEL_ACCESS_TOKEN exists in .env

If empty → LINE Official Account needs setup. This is a multi-step process:

##### a. Create LINE Official Account
Use Playwright to navigate:
```
Playwright: browser_navigate → https://entry.line.biz/form/entry/unverified
```
User logs in to LINE Business ID → skill fills form (account name, company, category) → submit.

##### b. Enable Messaging API
```
Playwright: browser_navigate → https://manager.line.biz/account/{BASIC_ID}/setting/messaging-api
```
Skill clicks "Enable Messaging API" → selects/creates provider → confirms.

##### c. Get Channel Access Token
```
Playwright: browser_navigate → https://developers.line.biz/console/channel/{CHANNEL_ID}/messaging-api
```
Skill clicks "Issue" on Channel access token → reads the token from page → saves to `.env`.

##### d. Enable webhook in LINE Developers Console
Navigate to webhook settings → skill clicks the "Use webhook" toggle to enable it.

#### 2. Install LINE Bot MCP

```bash
claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["-y","@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<from .env>"}}'
```

If npx is not available, try global install:
```bash
npm install -g @line/line-bot-mcp-server
# Then use the binary path directly
```

#### 3. Verify LINE Bot MCP

```
LINE Bot MCP: get_message_quota
```
Must return quota data.

### Part B: LINE Webhook

#### 1. Install cloudflared (if missing)

```bash
which cloudflared || brew install cloudflared
```

For Linux:
```bash
which cloudflared || (curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared)
```

#### 2. Start webhook server

```bash
python3 scripts/line-webhook.py &
sleep 1
curl -s http://localhost:8765  # Should return "ok"
```

#### 3. Start cloudflared tunnel

```bash
cloudflared tunnel --url http://localhost:8765 2>&1 | tee /tmp/cloudflared.log &
sleep 5
TUNNEL_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)
```

#### 4. Register webhook URL with LINE

```bash
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\": \"$TUNNEL_URL\"}"
```

#### 5. Enable webhook in LINE Developers Console

Navigate to LINE Developers Console → channel → Messaging API tab → "Use webhook" toggle → enable.

#### 6. Verify webhook

```bash
curl -s -X POST "https://api.line.me/v2/bot/channel/webhook/test" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\": \"$TUNNEL_URL\"}"
```

Must return `{"success": true}`.

#### 7. Disable auto-response messages

Navigate to LINE OA Manager → Response settings → turn OFF "Auto-response messages" toggle (prevents the default "本帳號無法個別回覆" message).

#### 8. Verify API access (no actual send)

```
LINE Bot MCP: get_message_quota
```

Must return quota data. If OK → `✅ LINE configured. Broadcast will reach all followers.`

**Do NOT send any actual message during init.**

## User interaction

- LINE Business ID login: user types password (once)
- SMS verification for LINE OA creation (if needed)
- Everything else: skill auto-drives (form filling, token creation, webhook setup)
