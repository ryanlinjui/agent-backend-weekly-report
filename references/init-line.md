# Init: LINE

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

**NEVER ask the user to provide the Channel Access Token. The agent must obtain it via browser automation from LINE Developers.**

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

## Get Channel Access Token (headless — if login required, visible then close)

8. Using `playwright-headless`, navigate to `https://developers.line.biz`. If a login page appears: **close headless**, use `playwright-login` for user to log in, then **close visible browser** and switch back to `playwright-headless`.
9. Select the channel linked to the OA → Messaging API tab → Issue / copy the long-lived Channel Access Token
10. Save to `config.json` as `line_channel_access_token`

**Session persists** — QA skill uses Playwright headless to read incoming messages from OA Manager Chat tab.
