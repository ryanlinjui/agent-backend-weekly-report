# Send Report via LINE

Broadcast the approved report to ALL followers of the LINE Official Account using the Messaging API broadcast endpoint.

## Prerequisites
- `LINE_CHANNEL_ACCESS_TOKEN` must be set in `.env`
- Recipients must have added the bot (@214lbnja) as a LINE friend

No user IDs needed — broadcast sends to everyone who follows the bot.

## Steps

### 1. Send via broadcast API

```bash
curl -s -X POST "https://api.line.me/v2/bot/message/broadcast" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -d '{
    "messages": [
      {
        "type": "text",
        "text": "{REPORT_PLAIN_TEXT}"
      }
    ]
  }'
```

The `{REPORT_PLAIN_TEXT}` is the same clean plain-text version shown in the approval gate (unicode headings ═/─ and bullet chars •). LINE messages are plain text only.

**Important:** LINE text messages have a 5000 character limit. If the report exceeds this, split into multiple messages (each ≤ 5000 chars), splitting at section boundaries.

### 2. Verify response

The broadcast API returns `{}` (empty object) on success, or an error object on failure.

On success: print `✅ LINE broadcast sent to all followers`
On error: print the error. Do not fail the whole pipeline.

## Fallback

If `LINE_CHANNEL_ACCESS_TOKEN` is not set, skip LINE delivery with a warning. Do not fail the pipeline.
