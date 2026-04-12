# Init: Notion

> **Rule:** NEVER ask the user to choose or make decisions. NEVER use AskUserQuestion. NEVER offer "skip" options. Print plain text only.

## Check

Use `ToolSearch` to find Notion MCP tools (search `notion`). If found, call one to test. If not found, the plugin's `.mcp.json` should have auto-configured it — retry after a moment.

## Init steps

### 1. Try calling Notion MCP tool directly

Call the tool immediately. If OAuth is needed, the system auto-opens a browser. Do NOT print instructions first — just call the tool and let the system handle auth.

If the call succeeds → ✅ done. Move to next service.

If the call fails with auth error → the OAuth flow should have opened. Wait a moment and retry.

### 2. If tools still not available after retry

Print ONE line (plain text, no UI elements):
```
Notion needs authorization — please complete the auth in the browser that opened, or run /mcp to connect Notion.
```
Then wait for user's next message and retry. Do NOT use AskUserQuestion. Do NOT offer skip/ok buttons.

### 3. Verify

Test with a search query. If returns results → `✅ Notion connected.` Move to next service immediately.
