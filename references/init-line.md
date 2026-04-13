# Init: LINE

**Use OpenCLI browser commands only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

**NEVER ask the user to provide the Channel Access Token. The agent must obtain it via browser automation from LINE Developers.**

## Login

1. Run `opencli browser open https://manager.line.biz`
2. Run `opencli browser state` to check if already logged in
3. If not logged in → ask user to log in to LINE in their Chrome browser → after confirmed, re-run `opencli browser open` + `opencli browser state`
4. Verify account identity → `opencli browser close`

## Setup (agent operates)

5. Run `opencli browser open https://manager.line.biz`
6. Always create a **new** LINE Official Account for weekly report (ignore existing ones, auto-agree to all terms/conditions)
7. Enable Messaging API via Settings (auto-agree to any terms)
8. In Settings → Response settings:
   - Enable **Chat** (toggle ON — required for QA to read/reply messages via web)
   - Disable **Auto-reply**
   - Disable **Greeting message**
9. Use `opencli browser state` to inspect page, `opencli browser click`, `opencli browser type`, `opencli browser keys` to navigate and configure

## Get Channel Access Token

10. Run `opencli browser open https://developers.line.biz`. If a login page appears: ask user to log in to LINE Developers in Chrome, then re-run `opencli browser open` + `opencli browser state`.
11. Use `opencli browser state` to find the channel linked to the OA → navigate to Messaging API tab → Issue / copy the long-lived Channel Access Token using `opencli browser click` and `opencli browser get text <N>`
12. Save to `config.json` as `line_channel_access_token`
13. Run `opencli browser close`

**QA skill uses `opencli browser open https://manager.line.biz` to read incoming messages from OA Manager Chat tab.**
