# Fetch Slack Messages

Read the producer's messages from Slack using the User OAuth Token and search API.

## Prerequisites
- `SLACK_USER_TOKEN` must be set in `.env` (a `xoxp-` token with `search:read` scope)
- No bot join needed — User Token has access to all channels the producer is a member of

## Steps

### 1. Search for producer's messages in the window

Use the Slack `search.messages` API with the User Token. This searches across ALL channels the user has access to — no need to list/join channels individually.

```bash
curl -s -G "https://slack.com/api/search.messages" \
  -H "Authorization: Bearer $SLACK_USER_TOKEN" \
  --data-urlencode "query=from:me after:{W_start}" \
  --data-urlencode "sort=timestamp" \
  --data-urlencode "count=50"
```

`from:me` filters to the authenticated user's own messages. `after:{W_start}` filters by date.

### 2. Parse results

The response contains `messages.matches[]` with:
- `channel.name` — which channel
- `ts` — timestamp
- `text` — message content
- `permalink` — link to the message

Keep the raw matches. Do NOT summarize yet — that happens at the draft step.

### 3. If search returns too many results

If more than 50 messages, paginate using `page=2`, `page=3`, etc. until all messages in the window are fetched.

### 4. Output format

Keep raw messages with: channel name, timestamp, text content, permalink. Do NOT summarize yet.

## Fallback

If `SLACK_USER_TOKEN` is not set, try `SLACK_BOT_TOKEN` as fallback (but bot needs to be in the channels). If neither is set, skip Slack source with a warning. Do not fail the entire pipeline.
