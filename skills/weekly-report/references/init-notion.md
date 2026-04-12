# Init: Notion

> **Rule:** NEVER ask the user to choose or make decisions. Try every approach automatically. If one fails, silently try the next. Only pause when user must physically act (password, SMS, /mcp). After they act, immediately continue.

## Check

Use `ToolSearch` to find Notion MCP tools (search `notion`). If found, test:
```
Notion MCP: notion-search → query: "meeting" page_size: 1
```
- If returns results → ✅ done.
- If auth error or no tools → needs init.

## Init steps

### 1. Try calling Notion MCP tool directly

Just call the tool. If OAuth is needed, the system automatically opens a browser for the user to authorize. Do NOT tell user to run `/mcp` first — try the tool call first and let the system handle auth.

### 2. If no Notion MCP tools exist at all

Only as last resort:
```
⚠️ Notion MCP not available. Please run /mcp → connect Notion, then say "ok".
```
Then retry step 1.

### 3. Verify

```
Notion MCP: notion-search → query: "meeting" page_size: 1
```
Must return results → `✅ Notion connected.`

## User interaction

- OAuth authorization in browser (automatic popup — user clicks Allow)
- Only if MCP missing entirely: `/mcp` connect (once)
