---
name: weekly-report-config
description: Change weekly report settings — add/remove recipients, re-init services, update credentials. Use when user says "config", "設定", "change recipients", "add recipient", "重新設定".
---

# Weekly Report Config

Interactive configuration for changing existing settings.

## Step 1: Show current settings

Read `.env` and display (mask passwords):

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

## Step 2: Wait for user instruction

User says what to change (e.g., "add ryanlinjui@gmail.com to recipients", "change window to 14 days").

## Step 3: Update

Follow the corresponding init reference from [../weekly-report/references/](../weekly-report/references/):
- init-github.md, init-email.md, init-slack.md, init-notion.md, init-line.md, init-linkedin.md

Update `.env` with new values.

## Step 4: Verify

Print updated config. Verify changed services are working (no actual sends — just API/connection checks).
