# Inbound Q&A — Email

Check for replies to the weekly report and respond via osascript + Mail.app.

## Prerequisites
- macOS with Mail.app configured
- No MCP needed — uses Bash tool + osascript only

## Flow

### 1. Search for unread replies

Run via Bash:

```bash
osascript <<'APPLESCRIPT'
tell application "Mail"
    set results to ""
    set unreadMessages to (every message of inbox whose read status is false and subject contains "Re: Weekly Report")
    repeat with msg in unreadMessages
        set msgSender to sender of msg
        set msgSubject to subject of msg
        set msgContent to content of msg
        set msgDate to date received of msg
        set results to results & "---FROM: " & msgSender & linefeed & "DATE: " & msgDate & linefeed & "SUBJECT: " & msgSubject & linefeed & "BODY: " & msgContent & linefeed & linefeed
    end repeat
    return results
end tell
APPLESCRIPT
```

If output is empty: `📭 No new questions found in email replies.` → done.

### 2. Parse each question

From the output, extract each message's sender, date, and body (the question).

### 3. Compose grounded answer

Using the **last report's raw data**:
- Only reference items from raw data
- Cite specific PRs, issues, Slack messages, Notion pages
- If cannot answer: "這個問題超出目前週報的資料範圍，建議直接聯繫相關人員。"
- Never fabricate

### 4. Reply via osascript

For each question, reply:

```bash
osascript <<'APPLESCRIPT'
tell application "Mail"
    set theMessage to first message of inbox whose subject contains "Re: Weekly Report" and sender contains "{SENDER_EMAIL}" and read status is false
    set theReply to reply theMessage
    set content of theReply to "{ANSWER}"
    send theReply
    set read status of theMessage to true
end tell
APPLESCRIPT
```

### 5. Summary

Print how many questions were answered.

## Fallback

If osascript fails, skip email Q&A with a warning.
