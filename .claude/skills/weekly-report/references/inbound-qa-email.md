# Inbound Q&A — Email

Check for replies to the weekly report and respond with grounded answers via Computer Use MCP + Mail.app.

## Prerequisites
- Computer Use MCP must be connected (`mcp__computer-use__*` tools)
- Mail.app must have the email account configured
- Must `request_access` for Mail.app

## Flow

### 1. Open Mail.app inbox
- `open_application` → "Mail"
- `screenshot` to see inbox

### 2. Search for replies
- `key` → `Cmd+F` or click search bar
- `type` → "Re: Weekly Report"
- `screenshot` to see results
- Look for unread replies (bold text / blue dot)

### 3. Read each question
- `click` on the unread reply
- `screenshot` to read the message content
- Extract: sender name, question text

### 4. Compose grounded answer
Using the **last report's raw data**:
- Only reference items from raw data
- Cite specific PRs, issues, Slack messages, Notion pages
- If cannot answer: "這個問題超出目前週報的資料範圍，建議直接聯繫相關人員。"
- Never fabricate

### 5. Reply
- `key` → `Cmd+R` (Reply)
- `type` the grounded answer
- `key` → `Cmd+Shift+D` (Send)

### 6. Next
Move to the next unread reply.

## When no replies found
```
📭 No new questions found in email replies.
```

## Fallback
If Computer Use MCP is not available, skip email Q&A with a warning.
