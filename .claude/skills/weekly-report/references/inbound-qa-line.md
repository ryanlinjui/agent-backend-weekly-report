# Inbound Q&A — LINE

Check for and respond to messages sent to the LINE Official Account bot.

## Prerequisites
- LINE Bot MCP must be connected (`mcp__line-bot__*` tools available)
- No browser needed — MCP handles everything via API

## Flow

### 1. Check for new messages

Use LINE Bot MCP tools to check for recent messages or webhook events.

Note: LINE's messaging model is event-driven (webhook-based). Without a webhook server, the MCP may not be able to retrieve incoming messages directly. In this case:

**Option A (if MCP has message reading capability):**
Use the appropriate MCP tool to list recent messages/events.

**Option B (fallback — Chrome DevTools MCP):**
If LINE Bot MCP cannot read incoming messages, use Chrome DevTools MCP to check the LINE OA Manager chat page:
1. `navigate_page` → `https://chat.line.biz/account/@214lbnja`
2. `take_snapshot` to see chat list
3. Look for chats with unread messages

### 2. Read each question

For each new message, extract:
- The user's display name
- The question text
- Timestamp

### 3. Compose a grounded answer

Using the **last report's raw data**:
- Only reference items from raw data
- Cite specific items
- If cannot answer: "抱歉，這個問題超出目前週報的資料範圍。建議直接聯繫相關人員。"
- Never fabricate

### 4. Send the reply

Use LINE Bot MCP push message tool to reply to the user (need their user ID from the incoming message event).

### When no messages found

```
📭 No new questions found in LINE messages.
```

## Fallback

If LINE Bot MCP is not connected, skip LINE Q&A with a warning.
