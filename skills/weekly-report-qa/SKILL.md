---
name: weekly-report-qa
description: Check for and reply to inbound questions about the weekly report. Scans Email and LINE for unread replies, composes grounded answers in the user's voice. Use when user says "qa", "check replies", "回覆", "有人問問題嗎".
---

# Weekly Report Q&A

One-shot check for inbound questions and reply.

## Step 1: Load context

If raw data from the last weekly report is still in working memory, use it. Otherwise, re-fetch from all sources using the same window.

## Step 2: Check Email

Follow [../weekly-report/references/inbound-qa-email.md](../weekly-report/references/inbound-qa-email.md).

## Step 3: Check LINE

Follow [../weekly-report/references/inbound-qa-line.md](../weekly-report/references/inbound-qa-line.md).

## Step 4: Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 Q&A Summary
  Email: {N} questions answered
  LINE:  {N} questions answered
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rules

- Reply in the user's voice — follow [../weekly-report/references/voice-profile.md](../weekly-report/references/voice-profile.md).
- Every answer must trace to raw data. Never fabricate.
- If cannot answer: say so honestly, suggest contacting the producer directly.
