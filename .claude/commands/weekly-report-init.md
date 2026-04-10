---
description: Initialize the weekly-report skill — set up credentials, tokens, and recipients for all sources and channels
---

Run the weekly-report initialization flow. This sets up all the configuration needed before the skill can run.

Walk me through setting up each service one by one. For each service:
1. Check if the credential is already in `.env`
2. If not, guide me through obtaining it (open the relevant admin page, create the token/app, etc.)
3. Verify the credential works (test API call)
4. Save to `.env`

Services to configure:
- **GitHub**: verify `gh auth status` works, save `GITHUB_USERNAME`
- **Gmail**: set `GMAIL_USER`, verify Playwright can open Gmail (user must log in if needed)
- **Slack**: create a Slack App with Bot Token if needed, save `SLACK_BOT_TOKEN`, verify with `auth.test`
- **Notion**: verify Notion MCP is connected (no token needed)
- **LINE**: create LINE Official Account + Messaging API channel if needed, save `LINE_CHANNEL_ACCESS_TOKEN`, verify with `bot/info`
- **Recipients**: set `REPORT_RECIPIENTS` (email addresses) and `LINE_RECIPIENT_IDS` (LINE user IDs)
- **Report window**: set `REPORT_WINDOW_DAYS` (default: 7)

After all services are configured, run a quick verification summary showing which services are ready.

Save all credentials to `.env` at the project root. Ensure `.env` is in `.gitignore`.
