#!/bin/bash
# Weekly Report QA — Cron polling script
# Runs every N minutes to check for and reply to inbound questions.
# Set up via: crontab -e → add the cron line shown at the bottom.

set -euo pipefail

PROJECT_DIR="/Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report"
CLAUDE_BIN="/Users/ryanlinjui/.local/bin/claude"
LOG_FILE="/tmp/weekly-report-qa.log"

echo "=== QA check started at $(date) ===" >> "$LOG_FILE"

cd "$PROJECT_DIR"

"$CLAUDE_BIN" --dangerously-skip-permissions -p "
You are running as an automated cron job for the weekly-report skill.

Read the .env file for configuration. Then check for inbound questions:

1. EMAIL: Use Playwright MCP to open Gmail (a02733613424@gmail.com) and search for unread replies with subject containing 'Re: Weekly Report'. For each unread reply, read the question, compose a grounded answer using the last report's data sources (re-fetch from GitHub/Slack/Notion if needed), and reply via Gmail compose. Follow references/inbound-qa-email.md.

2. LINE: Use Playwright MCP to check LINE OA Manager chat at https://chat.line.biz/account/@214lbnja for unread messages. For each message, compose a grounded answer and reply. Follow references/inbound-qa-line.md.

If Playwright MCP is not available, try checking email via other means or skip with a warning.
If Notion MCP is not available, skip Notion data and note it.

Be autonomous — do not ask for confirmation. Answer questions directly.
Print a summary at the end showing how many questions were answered.
" --output-format text >> "$LOG_FILE" 2>&1

echo "=== QA check finished at $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Cron setup (every 30 minutes):
# crontab -e
# */30 * * * * /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/skills/weekly-report/scripts/qa-cron.sh
