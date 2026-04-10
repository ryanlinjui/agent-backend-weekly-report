# Inbound Q&A — LINE

Receive and respond to LINE messages via a local webhook server + tunnel.

## Architecture

```
LINE user sends message
  → LINE server POSTs to webhook URL
  → tunnel (localtunnel or ssh) forwards to localhost
  → scripts/line-webhook.py saves to /tmp/line-inbox.json
  → QA polling reads inbox file → composes grounded answer
  → LINE Bot MCP push_text_message replies to user
```

## Setup (auto-init during Step 0)

### 1. Start webhook server

```bash
python3 .claude/skills/weekly-report/scripts/line-webhook.py &
```

Listens on port 8765 by default. Saves messages to `/tmp/line-inbox.json`.

### 2. Start tunnel

Try in order (handles missing npx):

```bash
# Option A: npx localtunnel (if npx available)
npx -y localtunnel --port 8765

# Option B: ssh tunnel (if npx not available, ssh is everywhere)
ssh -o StrictHostKeyChecking=no -R 80:localhost:8765 nokey@localhost.run
```

Or use helper: `bash .claude/skills/weekly-report/scripts/tunnel.sh 8765`

Capture the public URL from output.

### 3. Set LINE webhook URL

```bash
curl -s -X PUT "https://api.line.me/v2/bot/channel/webhook/endpoint" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\": \"{TUNNEL_URL}\"}"
```

### 4. Verify webhook

```bash
curl -s -X POST "https://api.line.me/v2/bot/channel/webhook/test" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endpoint\": \"{TUNNEL_URL}\"}"
```

Should return `{"success": true}`.

## Reading incoming messages

Read `/tmp/line-inbox.json`. Each entry:

```json
{
  "timestamp": "2026-04-11T04:30:00",
  "user_id": "U1234...",
  "reply_token": "abc123...",
  "text": "Collaboration Network 那個 PR 改了什麼？",
  "handled": false
}
```

Filter for `"handled": false`.

## Replying

Use LINE Bot MCP `push_text_message` with the user's `user_id`:

After replying, mark the message as `"handled": true` in the inbox file.

## Grounding rules

- Only reference items from raw data
- Cite specific items
- Never fabricate
- If cannot answer: "抱歉，這個問題超出目前週報的資料範圍。建議直接聯繫相關人員。"

## When no messages found

```
📭 No new questions found in LINE messages.
```

## Cleanup

When session closes, the webhook server and tunnel die automatically (background processes). `/tmp/line-inbox.json` persists but is harmless.
