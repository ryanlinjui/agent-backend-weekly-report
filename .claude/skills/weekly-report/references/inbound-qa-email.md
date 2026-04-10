# Inbound Q&A — Email

Check for replies to the weekly report and respond with grounded answers.

## Flow

### 1. Open Gmail and search for replies

Use Playwright MCP to navigate to Gmail and search for unread replies:

1. `browser_navigate` → `https://mail.google.com/mail/u/0/#search/is%3Aunread+subject%3A%22Re%3A+Weekly+Report%22`
2. `browser_snapshot` to see the search results
3. For each unread reply thread, click to open it

### 2. Read the question

From each reply:
- Extract the sender's name and email
- Extract the question text (the most recent reply in the thread, not the original report)
- Note the date/time

### 3. Compose a grounded answer

Using the **last report's raw data** (from the most recent `/weekly-report` run):
- If the raw data is still in your working memory from a recent run, use it directly
- If not, re-fetch from GitHub/Slack/Notion using the same window as the last report

**Grounding rules (same as report drafting):**
- Only reference items that exist in the raw data
- Cite specific PRs, issues, commits, Slack messages, or Notion pages
- If you cannot answer from the data, say: "這個問題超出目前週報的資料範圍，我無法提供確切的回答。建議直接聯繫 [producer name]。"
- Never fabricate an answer

### 4. Send the reply

Use Playwright MCP to reply in Gmail:
1. Click the Reply button on the thread
2. Type the grounded answer into the reply field
3. Click Send

### 5. Mark as handled

After replying, the email is no longer unread. Move to the next unread reply.

## When no replies found

If the Gmail search returns no unread replies:
```
📭 No new questions found in email replies.
```
