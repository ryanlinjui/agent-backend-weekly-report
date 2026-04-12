---
name: weekly-report-config
description: Change weekly report settings. Use when user says "config", "設定", "change recipients".
---

# Config

Auto-detect user language from OS locale or their message. Use that language for all output.

## If user specifies what to change

1. Read `skills/weekly-report/config.json`, show current settings (mask tokens)
2. Update the specified fields
3. Verify changed service works

## If user does NOT specify (default: full reset)

1. Show warning (in detected language): all config and login sessions will be reset. Ask: "Are you sure you want to reset everything? Or would you like to change specific settings? (e.g. Email, LINE, LinkedIn, recipients)"
2. **Wait for user to respond before proceeding** — if user specifies items, switch to the "specifies what to change" flow above
3. Call `browser_close` on both `playwright-login` and `playwright-headless` to kill any active browser session
4. Delete `skills/weekly-report/.browser-session/` (all saved login sessions)
5. Delete `skills/weekly-report/config.json`
6. Remove `line-bot` entry from `.mcp.json` if present
7. Re-run the full init flow from weekly-report SKILL.md Step 0 (GitHub check → ask recipients → browser login for Email, LINE, LinkedIn)
