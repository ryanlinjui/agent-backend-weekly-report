# Inbound Q&A — LINE

Check for and respond to messages sent to the LINE bot.

## Limitation

LINE Bot MCP can **send** messages (broadcast/push) but **cannot read** incoming messages — LINE's Messaging API requires a webhook server to receive events. Without a webhook, the agent cannot detect when someone sends a question.

## Workaround options (in priority order)

### Option A: Computer Use MCP + LINE desktop app (if installed)

If the user has the LINE desktop app installed on macOS:

1. `request_access` for LINE app
2. `open_application` → "LINE"
3. `screenshot` to see chat list
4. Look for unread messages from the Weekly Report Agent chat
5. `click` on the chat
6. `screenshot` to read the message
7. Compose grounded answer
8. `type` the answer + `key` → `Return` to send

### Option B: Notify user to check manually

If neither Computer Use nor LINE desktop is available:

```
📭 LINE inbound Q&A is not available in this session.
   LINE Bot MCP can send but cannot read incoming messages.
   Please check LINE manually for any questions.
```

## Grounding rules (same as email Q&A)
- Only reference items from raw data
- Cite specific items
- Never fabricate
- If cannot answer: "抱歉，這個問題超出目前週報的資料範圍。建議直接聯繫相關人員。"
