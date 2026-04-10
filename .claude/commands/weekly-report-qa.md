---
description: Check for and respond to questions about the weekly report — scans Gmail and LINE for replies, answers with grounded Q&A
---

Run the weekly-report Q&A flow. Check for incoming questions from report recipients and respond with grounded answers.

## Steps

### Step 0: Load configuration
Read `.env` for `GMAIL_USER`, `LINE_CHANNEL_ACCESS_TOKEN`, and other config values.

### Step 1: Load or re-fetch report data
Check if raw data from the last `/weekly-report` run is still in your working memory. If not, re-fetch from all sources (GitHub, Slack, Notion) using the same window as the last report. This data is used to ground all answers.

### Step 2: Check Email replies
Read and follow `references/inbound-qa-email.md`. Use Playwright to check Gmail for unread replies to "Weekly Report" emails. For each question, compose a grounded answer and reply.

### Step 3: Check LINE messages
Read and follow `references/inbound-qa-line.md`. Use Playwright to check LINE OA Manager for unread messages. For each question, compose a grounded answer and reply.

### Step 4: Summary
Print how many questions were answered:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 Q&A Summary
  Email: {N} questions answered
  LINE:  {N} questions answered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Grounding rules (same as weekly report)
- Every answer must trace to raw data from GitHub, Slack, or Notion
- Cite specific items (PR numbers, issue titles, meeting note titles, Slack channel names)
- If the question cannot be answered from available data, say so honestly — never fabricate
- When acknowledging a question without a data-backed answer, use: "感謝您的問題。目前週報資料中沒有相關紀錄，建議直接聯繫 Ryan。"
