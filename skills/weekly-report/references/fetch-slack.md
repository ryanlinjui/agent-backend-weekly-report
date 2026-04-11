# Fetch Slack Messages

Read the producer's messages and key discussions from Slack using the Slack MCP tools.

## Prerequisites
- Slack MCP must be connected in Claude Code (`mcp__plugin_slack_slack__*` tools available)
- No API tokens needed — MCP handles authentication

## Steps

### 1. Search for producer's messages in the window

Use `mcp__plugin_slack_slack__slack_search_public_and_private` to search for the producer's messages:

Query: `from:me after:{W_start}` (searches ALL channels the user has access to)

### 2. Read key channels

For channels with significant activity, use `mcp__plugin_slack_slack__slack_read_channel` to get full context of discussions the producer participated in.

### 3. Read important threads

For threaded discussions, use `mcp__plugin_slack_slack__slack_read_thread` to get the full thread context.

### 4. Output format

Keep the raw messages with: channel name, timestamp, text content. Focus on:
- Decisions made
- Tasks discussed or assigned
- Coordination with teammates
- Notable discussions

Do NOT summarize yet — that happens at the draft step.

## Fallback

If Slack MCP is not connected, try using `SLACK_USER_TOKEN` from `.env` with curl (search.messages API). If neither is available, skip Slack source with a warning. Do not fail the entire pipeline.
