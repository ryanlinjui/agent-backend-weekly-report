# Send Report via LINE

Broadcast the approved report to ALL followers of the LINE Official Account using LINE Bot MCP.

## Prerequisites
- LINE Bot MCP must be connected in Claude Code (`mcp__line-bot__*` tools available)
- No manual API calls needed — MCP handles authentication and messaging

## Steps

### 1. Send via LINE Bot MCP broadcast tool

Use the LINE Bot MCP broadcast tool to send the clean plain-text version of the report to all followers.

**Important:** LINE text messages have a 5000 character limit. If the report exceeds this, split into multiple messages at section boundaries.

### 2. Verify

On success: print `✅ LINE broadcast sent to all followers`
On error: print the error. Do not fail the whole pipeline.

## Fallback

If LINE Bot MCP is not connected, try using `LINE_CHANNEL_ACCESS_TOKEN` from `.env` with curl:

```bash
curl -s -X POST "https://api.line.me/v2/bot/message/broadcast" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -d '{"messages":[{"type":"text","text":"{REPORT_PLAIN_TEXT}"}]}'
```

If neither MCP nor token is available, skip LINE delivery with a warning.
