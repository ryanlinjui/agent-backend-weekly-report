---
name: config
description: Change weekly report settings — add/remove recipients, re-init services, update credentials. Use when user says "config", "設定", "change recipients", "add recipient", "change email", "重新設定".
---

# Weekly Report Config

Interactive configuration. Same as init but for changing existing settings.

### Step 1: Show current settings

Read `.env` and display current config (mask passwords):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Current config
  GitHub:     {GITHUB_USERNAME}
  Email:      {EMAIL_USER} → {REPORT_RECIPIENTS}
  LINE:       ✅ / ❌
  LinkedIn:   {LINKEDIN_RECIPIENTS}
  Window:     {REPORT_WINDOW_DAYS} days
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Ask what to change

Wait for user to say what they want to modify.

### Step 3: Update

Follow the corresponding init reference to update:
- [../weekly-report/references/init-github.md](../weekly-report/references/init-github.md)
- [../weekly-report/references/init-email.md](../weekly-report/references/init-email.md)
- [../weekly-report/references/init-slack.md](../weekly-report/references/init-slack.md)
- [../weekly-report/references/init-notion.md](../weekly-report/references/init-notion.md)
- [../weekly-report/references/init-line.md](../weekly-report/references/init-line.md)
- [../weekly-report/references/init-linkedin.md](../weekly-report/references/init-linkedin.md)

### Step 4: Verify + save

Update `.env` with new values. Print updated config.
