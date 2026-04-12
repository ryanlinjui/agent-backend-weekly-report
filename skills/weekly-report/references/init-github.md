# Init: GitHub

> **Rule:** NEVER ask the user to choose or make decisions. Try every approach automatically. If one fails, silently try the next. Only pause when user must physically act (password, SMS, /mcp). After they act, immediately continue.
> **Claude Desktop:** No terminal available. Use tool calls and file edits instead of Bash/CLI. For MCP install, edit `~/Library/Application Support/Claude/claude_desktop_config.json`.

## Check

```bash
gh auth status
```

- If output contains `Logged in` → ✅ already initialized. Extract username and save to `.env` as `GITHUB_USERNAME`.
- If fails → ❌ needs init.

## Init steps

### 1. Auto-start login

```bash
gh auth login --web
```

This automatically opens the browser. User clicks "Authorize" in the browser.

### 2. Wait for auth to complete

`gh auth login --web` blocks until the user completes the browser auth. No need to ask user "ok" — the command returns when done.

### 3. Extract username

```bash
gh api user --jq '.login'
```

Save result to `.env` as `GITHUB_USERNAME`.

### 4. Verify

```bash
gh auth status
```

Must show `Logged in`. If not → retry from step 1.

## User interaction

- User clicks "Authorize" in browser (automatic open)
- No CLI typing needed
