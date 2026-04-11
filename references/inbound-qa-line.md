# Inbound Q&A — LINE

Receive and respond to LINE messages via cloudflared webhook + LINE Bot MCP push reply.

## Architecture

```
LINE user sends message
  → LINE server POSTs to cloudflared tunnel URL
  → cloudflared forwards to localhost:8765
  → scripts/line-webhook.py saves to /tmp/line-inbox.json
  → QA polling reads inbox → composes grounded answer
  → LINE Bot MCP push_text_message replies to user
```

## Auto-start during init (Step 0)

All fully automated — no user action:

```bash
# 1. Start webhook server
python3 .claude/skills/weekly-report/scripts/line-webhook.py &

# 2. Start cloudflared tunnel
cloudflared tunnel --url http://localhost:8765 2>&1 | tee /tmp/cloudflared.log &
sleep 5
TUNNEL_URL=$(grep -o 'https://[^ ]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)

# 3. Set + activate LINE webhook
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\": \"$TUNNEL_URL\"}"

# 4. Verify
curl -s -X POST "https://api.line.me/v2/bot/channel/webhook/test" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\": \"$TUNNEL_URL\"}"
# Must return {"success": true}
```

If cloudflared is not installed, auto-install:
```bash
# macOS
brew install cloudflared
# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared
```

## QA check flow

### 1. Read inbox

```bash
cat /tmp/line-inbox.json
```

Each entry:
```json
{
  "timestamp": "2026-04-11T15:25:50",
  "user_id": "Uc7e0b36...",
  "reply_token": "a9335e9f...",
  "text": "這週做了什麼",
  "handled": false
}
```

Filter for `"handled": false`.

### 2. Compose grounded answer

Using the last report's raw data:
- Only reference items from raw data
- Cite specific PRs, issues, Slack messages, Notion pages
- If cannot answer: "抱歉，這個問題超出目前週報的資料範圍。建議直接聯繫相關人員。"
- Never fabricate

### 3. Reply via LINE Bot MCP

Use `push_text_message` with the user's `user_id`:

```
LINE Bot MCP: push_text_message
  userId: "{user_id from inbox}"
  message: {type: "text", text: "{grounded answer}"}
```

### 4. Mark as handled

Update `/tmp/line-inbox.json` — set `"handled": true` for the replied message.

### 5. Next message

Repeat for all unhandled messages.

## When no messages found

```
📭 No new questions found in LINE messages.
```

## Cleanup

When session closes, webhook server and cloudflared die automatically (background processes). `/tmp/line-inbox.json` persists but is harmless.
