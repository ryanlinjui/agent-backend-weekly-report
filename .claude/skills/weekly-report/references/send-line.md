# Send Report via LINE

Send the approved report to LINE recipients using the Messaging API push endpoint.

## Prerequisites
- `LINE_CHANNEL_ACCESS_TOKEN` must be set in `.env`
- `LINE_RECIPIENT_IDS` must contain at least one LINE user ID
- Recipients must have added the bot (@214lbnja) as a LINE friend

## Steps

### 1. Read recipient IDs

Read `LINE_RECIPIENT_IDS` from `.env`. It is a comma-separated list of LINE user IDs (e.g., `U1234abcd,U5678efgh`).

If `LINE_RECIPIENT_IDS` is empty, skip LINE sending and print a warning: "No LINE recipients configured. Skipping LINE delivery."

### 2. Send to each recipient

For each recipient user ID, use the LINE push message API:

```bash
curl -s -X POST "https://api.line.me/v2/bot/message/push" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -d '{
    "to": "{RECIPIENT_USER_ID}",
    "messages": [
      {
        "type": "text",
        "text": "{REPORT_PLAIN_TEXT}"
      }
    ]
  }'
```

The `{REPORT_PLAIN_TEXT}` is the same clean plain-text version shown in the approval gate (the one with unicode headings ═/─ and bullet chars •). LINE messages are plain text only — no HTML.

**Important:** LINE text messages have a 5000 character limit. If the report exceeds this, split into multiple messages (each ≤ 5000 chars), splitting at section boundaries.

### 3. Verify response

Each push API call returns a JSON response. Check for `{}` (empty object = success) or an error object.

On success: print `✅ Sent to LINE recipient {RECIPIENT_USER_ID}`
On error: print the error and continue to the next recipient. Do not fail the whole pipeline for one failed recipient.

## How to get recipient LINE user IDs

Recipients must add the bot as a friend first (search for @214lbnja in LINE app). Once added, their user ID can be retrieved via:

```bash
curl -s -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  "https://api.line.me/v2/bot/followers/ids"
```

This returns an array of user IDs of everyone who has added the bot. Match them with the intended recipients and save to `LINE_RECIPIENT_IDS` in `.env`.

## Fallback

If `LINE_CHANNEL_ACCESS_TOKEN` is not set, skip LINE delivery with a warning. Do not fail the pipeline.
