# Inbound Q&A — LINE

## Limitation

LINE Bot MCP can **send** messages (broadcast/push) but **cannot read** incoming messages — LINE requires a webhook server to receive message events, which this skill does not include.

## Approach: redirect to Slack

When broadcasting the weekly report via LINE (Step 8b), append a note at the end of the message:

```
有問題請到 Slack #general 討論，我會自動回覆。
```

This redirects LINE recipients to Slack, where Slack MCP can detect and respond to questions.

## LINE Q&A summary

When `/weekly-report-qa` runs, print:

```
📭 LINE: inbound Q&A not available (no webhook).
   LINE recipients are directed to ask on Slack.
```

## Future improvement

To enable true LINE inbound Q&A, set up a webhook server that:
1. Receives LINE message events
2. Stores them in a file or database
3. The skill reads that file during Q&A polling

This requires external infrastructure (cloud function, server) beyond the scope of this skill.
