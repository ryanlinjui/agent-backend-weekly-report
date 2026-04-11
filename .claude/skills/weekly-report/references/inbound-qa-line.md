# Inbound Q&A — LINE

Read and respond to LINE messages via LINE OA Manager Chat page using Playwright headless.

## Architecture

```
QA polling runs every ~30s:
  playwright-headless opens chat.line.biz (invisible, already logged in)
  → reads unread messages
  → composes grounded answer
  → types reply in chat UI + clicks Send (free, no quota)
  → closes

User sees: nothing. Browser is headless.
```

## Prerequisites

- `playwright-headless` MCP must be connected (headless, shared session with `playwright-login`)
- User must have logged in to LINE OA Manager at least once via `playwright-login` (headed, visible)
- Chat must be enabled in LINE OA Manager Response Settings

## Login (first time only)

If not logged in yet, use `playwright-login` (headed — browser visible):

```
playwright-login: browser_navigate → https://chat.line.biz/account/@214lbnja
```

Tell user:
```
🌐 LINE Chat login page opened. Please log in, then say "ok".
```

After login, the session is saved. Switch to `playwright-headless` for all subsequent operations.

## QA check flow (headless — invisible)

### 1. Open chat page

```
playwright-headless: browser_navigate → https://chat.line.biz/account/@214lbnja
playwright-headless: browser_snapshot → see chat list
```

### 2. Find unread chats

Look for chat entries with unread indicators. Click each one.

### 3. Read messages

```
playwright-headless: browser_snapshot → read the conversation
```

Extract the user's latest message (the question).

### 4. Compose grounded answer

Using the last report's raw data:
- Only reference items from raw data
- Cite specific PRs, issues, Slack messages, Notion pages
- If cannot answer: "抱歉，這個問題超出目前週報的資料範圍。建議直接聯繫相關人員。"
- Never fabricate

### 5. Reply via chat UI (free)

```
playwright-headless: browser_type → answer text in the message input box
playwright-headless: browser_click → Send button
```

This uses LINE's chat reply mechanism — **free, no quota consumed**.

### 6. Move to next chat

Repeat for all unread chats.

## When no messages found

```
📭 No new questions found in LINE messages.
```

## MCP selection rule

| Situation | Use | Why |
|---|---|---|
| User needs to log in | `playwright-login` (headed) | User must see browser to type password |
| Automated Q&A polling | `playwright-headless` | Invisible, user doesn't see anything |
| Both share session dir | `/tmp/playwright-session` | Login persists across headed↔headless |
