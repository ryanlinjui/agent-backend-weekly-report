# Init: LINE

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

## Login (visible browser — user operates)

1. Call `playwright-login` `browser_navigate` to `https://manager.line.biz` (visible browser)
2. User logs in manually
3. After login succeeds, **close visible browser**

## Setup (headless — agent operates)

4. Switch to `playwright-headless` for all remaining steps
5. Always create a **new** LINE Official Account for weekly report (ignore existing ones, auto-agree to all terms/conditions)
6. Enable Messaging API via Settings (auto-agree to any terms)
7. In Settings → Response settings:
   - Enable **Chat** (toggle ON — required for QA to read/reply messages via web)
   - Disable **Auto-reply**
   - Disable **Greeting message**

## Get Channel Access Token

8. Navigate to `https://developers.line.biz` → select the channel linked to the OA
9. Messaging API tab → Issue / copy the long-lived Channel Access Token
10. Save to `config.json` as `line_channel_access_token`

## Install LINE Bot MCP

11. Add `line-bot` entry to project root `.mcp.json`:
    ```json
    "line-bot": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@line/line-bot-mcp-server"],
      "env": { "CHANNEL_ACCESS_TOKEN": "<token>" }
    }
    ```
12. Verify: call `get_message_quota` → returns data → done

**Session saved to `.browser-session/`** — QA skill uses Playwright headless to read incoming messages from OA Manager Chat tab.
