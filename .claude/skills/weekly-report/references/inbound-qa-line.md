# Inbound Q&A — LINE

Check for messages sent to the LINE Official Account bot and respond with grounded answers.

## Flow

### 1. Open LINE OA Manager chat

Use Playwright MCP to navigate to the LINE OA Manager chat page:

1. `browser_navigate` → `https://chat.line.biz/account/@214lbnja`
2. `browser_snapshot` to see the chat list
3. Look for chats with unread messages (indicated by unread badges)

**Important:** The LINE OA Manager account (`a02733613424@gmail.com`) must be logged in on the Playwright browser. If it shows a login page, tell the user to log in and retry.

### 2. Read each message

For each chat with unread messages:
1. Click on the chat to open it
2. `browser_snapshot` to read the conversation
3. Extract the user's most recent message (the question)
4. Note the user's display name

### 3. Compose a grounded answer

Using the **last report's raw data** (from the most recent `/weekly-report` run):
- Only reference items that exist in the raw data
- Cite specific PRs, issues, commits, Slack messages, or Notion pages
- If you cannot answer: "抱歉，這個問題超出目前週報的資料範圍。建議直接聯繫相關人員。"
- Never fabricate

### 4. Send the reply

Two options (try in order):

**Option A: Reply via LINE OA Manager chat UI (preferred)**
1. In the open chat, type the answer into the message input field
2. Click Send
3. This uses LINE's free reply mechanism

**Option B: Reply via push API (fallback if chat UI doesn't work)**
Need the user's LINE user ID (visible in the chat URL or page source):
```bash
curl -s -X POST "https://api.line.me/v2/bot/message/push" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -d '{"to":"{USER_ID}","messages":[{"type":"text","text":"{ANSWER}"}]}'
```
Note: Push messages count toward the monthly quota (200/month free).

### 5. Move to next chat

After replying, move to the next unread chat.

## When no messages found

If no unread chats:
```
📭 No new questions found in LINE messages.
```

## LINE OA Manager chat mode

For the chat UI to work for sending replies, the LINE OA Manager must have chat enabled:
- Go to Settings → Response settings → enable "Chat"
- This may conflict with the "Bot" response mode. If so, use Option B (push API) instead.
