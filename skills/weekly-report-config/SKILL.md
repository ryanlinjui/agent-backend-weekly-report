---
name: weekly-report-config
description: Change weekly report settings. Use when user says "config", "設定", "change recipients".
---

# Config

## If user specifies what to change

1. Read `skills/weekly-report/config.json`, show current settings (mask tokens)
2. Update the specified fields
3. Verify changed service works

## If user does NOT specify (default: full reset)

1. Show warning: all config and login sessions will be reset
2. **Wait for user to confirm before proceeding**
3. Delete `skills/weekly-report/config.json`
4. Delete `skills/weekly-report/.browser-session/`
5. Re-run the full init flow from weekly-report SKILL.md Step 0 (GitHub check → ask recipients → browser login for Gmail, LINE, LinkedIn)
