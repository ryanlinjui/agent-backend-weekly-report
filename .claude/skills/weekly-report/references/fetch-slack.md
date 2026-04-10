# Fetch Slack Messages

Read the producer's messages from Slack channels in the report window.

## Prerequisites
- `SLACK_BOT_TOKEN` must be set in `.env`
- The bot must be invited to the relevant channels (use Slack API `conversations.join` if needed)

## Steps

### 1. List channels the bot can see

```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f\"{c['id']} {c['name']}\") for c in data.get('channels',[])]"
```

### 2. For each channel, fetch messages in the window

Substitute `{OLDEST}` with the Unix timestamp of `W_start` (compute via `date -j -f "%Y-%m-%d" "{W_start}" "+%s"` on macOS or `date -d "{W_start}" "+%s"` on Linux):

```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  "https://slack.com/api/conversations.history?channel={CHANNEL_ID}&oldest={OLDEST}&limit=200"
```

### 3. Filter for producer's messages

From the response JSON, filter `messages` where `user` matches the producer's Slack user ID. To find the producer's user ID:

```bash
curl -s -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  "https://slack.com/api/users.list" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); [print(f\"{m['id']} {m['real_name']}\") for m in data.get('members',[]) if not m.get('is_bot')]"
```

Look for the producer's name (Ryan Lin / ryanlinjui) in the output. Use that user ID to filter messages.

### 4. Output format

Keep the raw messages with: channel name, timestamp, text content. Do NOT summarize yet — that happens at the draft step.

## Fallback

If `SLACK_BOT_TOKEN` is not set or API returns an error, print a warning and skip Slack source. Do not fail the entire pipeline.
