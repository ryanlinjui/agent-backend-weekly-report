---
name: qa
description: Check for and reply to inbound questions about the weekly report. Scans Email (IMAP) and LINE (webhook inbox) for unread replies, composes grounded answers in the user's voice, and sends replies. Use when user says "qa", "check replies", "回覆", "有人問問題嗎".
---

# Weekly Report Q&A

One-shot check for inbound questions and reply.

### Step 1: Load report context

If raw data from the last report is still in working memory, use it. Otherwise, re-fetch from all sources.

### Step 2: Check Email

Follow [../weekly-report/references/inbound-qa-email.md](../weekly-report/references/inbound-qa-email.md).

### Step 3: Check LINE

Follow [../weekly-report/references/inbound-qa-line.md](../weekly-report/references/inbound-qa-line.md).

### Step 4: Summary

Print using this template:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 Q&A Summary
  Email: {N} questions answered
  LINE:  {N} questions answered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Reply in the user's voice — follow [../weekly-report/references/voice-profile.md](../weekly-report/references/voice-profile.md).
