# Inbound Q&A — Email

Check for replies to the weekly report and respond via IMAP/SMTP — works with any email provider.

## Prerequisites
- `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Same universal email client as send-email.md

## Flow

### 1. Read unread replies

```bash
source .env
python3 .claude/skills/weekly-report/scripts/email-client.py read \
  --search 'UNSEEN SUBJECT "Re: Weekly Report"'
```

Returns JSON array:
```json
[
  {
    "message_id": "<abc@mail.gmail.com>",
    "from": "Wei <wei@example.com>",
    "subject": "Re: Weekly Report — 2026-04-04 to 2026-04-11",
    "date": "Fri, 11 Apr 2026 10:30:00 +0800",
    "body": "Collaboration Network PR 改了什麼？",
    "uid": "42"
  }
]
```

If empty array: `📭 No new questions found in email replies.` → done.

### 2. Compose grounded answer

For each message, using the **last report's raw data**:
- Only reference items from raw data
- Cite specific PRs, issues, Slack messages, Notion pages
- If cannot answer: "這個問題超出目前週報的資料範圍，建議直接聯繫相關人員。"
- Never fabricate

### 3. Reply

```bash
source .env
python3 .claude/skills/weekly-report/scripts/email-client.py reply \
  --uid "42" \
  --body "Collaboration Network (#331) 重構為 top-N contributors model..."
```

This sends a proper threaded reply (In-Reply-To + References headers) and marks the original as read.

### 4. Summary

Print how many questions were answered.
