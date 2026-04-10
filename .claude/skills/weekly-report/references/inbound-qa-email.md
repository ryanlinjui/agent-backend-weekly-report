# Inbound Q&A — Email

Check for replies to the weekly report and respond with grounded answers via Chrome DevTools MCP.

## Prerequisites
- Chrome DevTools MCP must be connected (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*` tools)
- User must be logged into Gmail in their Chrome browser

## Flow

### 1. Open Gmail and search for replies

1. `navigate_page` → `https://mail.google.com/mail/u/0/#search/is%3Aunread+subject%3A%22Re%3A+Weekly+Report%22`
2. `take_snapshot` to see search results
3. For each unread reply thread, `click` to open it

### 2. Read the question

From each reply:
- Extract the sender's name and email
- Extract the question text (the most recent reply, not the original report)
- Note the date/time

### 3. Compose a grounded answer

Using the **last report's raw data** (from the most recent `/weekly-report` run):
- If the raw data is still in working memory, use it directly
- If not, re-fetch from GitHub/Slack/Notion using the same window

**Grounding rules (same as report drafting):**
- Only reference items that exist in the raw data
- Cite specific PRs, issues, commits, Slack messages, or Notion pages
- If you cannot answer: "這個問題超出目前週報的資料範圍，建議直接聯繫相關人員。"
- Never fabricate

### 4. Send the reply

1. `click` the Reply button on the thread
2. `fill` the reply field with the grounded answer
3. `click` Send

### 5. Move to next

After replying, the email is no longer unread. Move to the next unread reply.

## When no replies found

```
📭 No new questions found in email replies.
```

## Fallback

If Chrome DevTools MCP is not connected, skip email Q&A with a warning.
