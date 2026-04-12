# Init: Notion

> **Rule:** NEVER ask the user to choose or make decisions. Try every approach automatically. If one fails, silently try the next. Only pause when user must physically act (password, SMS, /mcp). After they act, immediately continue.
> **Claude Desktop:** No terminal available. Use tool calls and file edits instead of Bash/CLI. For MCP install, edit `~/Library/Application Support/Claude/claude_desktop_config.json`.

## Check

Are `mcp__plugin_Notion_notion__*` tools available?

- If yes → ✅ already initialized. Test with:
  ```
  Notion MCP: notion-search → query: "meeting" page_size: 1
  ```
  If returns results → ✅ confirmed working.
- If no → ❌ needs init.

## Init steps

### 1. Check if Notion MCP plugin is installed

Look for `mcp__plugin_Notion_notion__*` in available tools.

### 2. If not installed — guide user

Notion MCP is an OAuth plugin that requires user authorization. Cannot be auto-installed silently.

```
⚠️ Notion MCP not connected. Please:
   1. Run /mcp → connect Notion plugin
   2. Authorize in the browser if prompted
   Then say "ok".
```

**Wait for "ok".**

### 3. Verify

Test with:
```
Notion MCP: notion-search → query: "meeting" page_size: 1
```

If returns results → `✅ Notion connected.`
If fails → retry from step 2.

## User interaction

- User runs `/mcp` and connects Notion plugin (once)
- OAuth authorization in browser (once)
