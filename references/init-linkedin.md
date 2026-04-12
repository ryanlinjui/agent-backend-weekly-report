# Init: LinkedIn

## Check

Are `mcp__linkedin__*` tools available?

- If yes → test:
  ```
  LinkedIn MCP: get_inbox
  ```
  If returns inbox data → ✅ already initialized.
  If "No valid LinkedIn session" → ❌ needs login.
- If no tools → ❌ needs MCP install.

## Init steps

### 1. Install LinkedIn MCP (if missing)

```bash
claude mcp add-json linkedin '{"type":"stdio","command":"uvx","args":["linkedin-scraper-mcp@latest"],"env":{"UV_HTTP_TIMEOUT":"300"}}'
```

If `uvx` not available:
```bash
pip install linkedin-scraper-mcp
```

### 2. First-time login

LinkedIn MCP auto-opens a browser window for login on first use.

Call any LinkedIn MCP tool (e.g., `get_inbox`). If it returns a login error:

```
🌐 LinkedIn login window opened. Please log in, then say "ok".
```

**Wait for "ok".** Session is saved to `~/.linkedin-mcp/` — persists across sessions.

### 3. Set recipients

If `LINKEDIN_RECIPIENTS` is empty in `.env`:
```
Who should receive the report on LinkedIn? (paste profile URLs, comma-separated)
```
Save to `.env` as `LINKEDIN_RECIPIENTS`.

### 4. Verify connection

```
LinkedIn MCP: get_inbox
```
Must return inbox data (not a login error).

### 5. Test send to each recipient

For each recipient in `LINKEDIN_RECIPIENTS`:
1. `LinkedIn MCP: get_person_profile` → confirm they're a 1st connection (shows "Message" button)
2. Send test via Playwright → LinkedIn compose → type "Weekly Report delivery test" → Send
3. If sent → `✅ LinkedIn DM works for {recipient}.`
4. If fails (not connected, composer unavailable) → explain to user: e.g., `⚠️ Cannot DM {recipient} — not a 1st connection. Send a connection request first?`
   - If user says yes → `LinkedIn MCP: connect_with_person` → retry after connected
   - If user says skip → remove from `LINKEDIN_RECIPIENTS` in `.env`

## User interaction

- LinkedIn login in browser (once, session persists)
- Provide recipient profile URLs (once)
