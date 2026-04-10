---
name: weekly-report
description: Generate and send a weekly report summarizing the producer's activity across GitHub, Slack, and Notion. Delivers via Email (Gmail) and LINE. Use when the user asks for "weekly report", "週報", "my week in review", or similar. Drafts the report against a fixed template, shows it in chat for explicit approval, and only sends after the user picks "送出".
---

# Weekly Report Skill

Produce a weekly report of the producer's activity across GitHub, Slack, and Notion, then deliver via Email and LINE. Mandatory approval gate in Claude Code chat before anything is sent.

## Configuration

All settings are read from the `.env` file at the project root. **Nothing is hardcoded.** These values are set during `/weekly-report-init`.

### Step 0: Load configuration & auto-init check

Read the `.env` file using the Read tool. Check each required service:

| Variable | Purpose | How to verify |
|---|---|---|
| `GITHUB_USERNAME` | GitHub user to query | `gh auth status` returns OK |
| `REPORT_RECIPIENTS` | Email addresses | Non-empty |
| `REPORT_WINDOW_DAYS` | Days to look back (default: 7) | Non-empty |
| `GMAIL_USER` | Gmail sender account | Non-empty |
| `SLACK_USER_TOKEN` | Slack User Token for search | `curl` auth.test returns OK |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API | `curl` bot/info returns OK |

**Auto-init: if any service is missing or broken, fix it inline — don't stop.**

#### 0a: Check all services and collect what's missing

Run all checks in parallel (Bash curl calls). Build a list of what needs init:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Service health check
  GitHub:  ✅ / ❌ (gh auth status)
  Gmail:   ✅ / ❌ (GMAIL_USER set + Playwright login check)
  Slack:   ✅ / ❌ (SLACK_USER_TOKEN valid)
  Notion:  ✅ / ❌ (Notion MCP connected)
  LINE:    ✅ / ❌ (LINE_CHANNEL_ACCESS_TOKEN valid)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If everything is ✅, proceed to Step 1.

#### 0b: Auto-install missing MCP servers

If any MCP is missing, **auto-install it** before asking the user to do anything.

**Step 1: Detect environment**

Check if running in Claude Code or Claude Desktop:
- Claude Code: `claude --version` succeeds via Bash → use `claude mcp add-json` to install
- Claude Desktop: check if `~/Library/Application Support/Claude/claude_desktop_config.json` exists → edit it directly with Write tool

**Step 2: Auto-install missing MCPs**

For each missing MCP, install it automatically:

**Slack MCP** (if Slack plugin tools not available):
Claude Code plugin — user needs to run `/mcp` to connect. Print: `⚠️ Run /mcp → connect Slack plugin`

**Notion MCP** (if Notion plugin tools not available):
Claude Code plugin — user needs to run `/mcp` to connect. Print: `⚠️ Run /mcp → connect Notion plugin`

**LINE Bot MCP** (if `mcp__line-bot__*` tools not available):
```bash
# Claude Code:
claude mcp add-json line-bot '{"type":"stdio","command":"npx","args":["@line/line-bot-mcp-server"],"env":{"CHANNEL_ACCESS_TOKEN":"<read from .env>"}}'
```
For Claude Desktop, write to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "line-bot": {
      "command": "npx",
      "args": ["@line/line-bot-mcp-server"],
      "env": {
        "CHANNEL_ACCESS_TOKEN": "<read from .env>"
      }
    }
  }
}
```

**Chrome DevTools MCP** (if chrome-devtools tools not available):
Claude Code plugin — user needs to run `/plugin` to install. Print: `⚠️ Run /plugin → install chrome-devtools-mcp`

**GitHub** (if `gh auth status` fails):
Print: `⚠️ Run 'gh auth login' in terminal`

**Step 3: Ask user to complete one-time actions**

After auto-installing what can be automated, print ONE combined message for remaining manual steps:

```
⚠️ First-time setup (one-time only):
  {list only the items that still need user action}

Please complete these, then say "ok".
```

If no manual steps needed (everything auto-installed), skip directly to verification.

**Wait for user to say "ok" / "done" / "好了"** — only if there are manual steps.

**Step 4: Verify all services**

Re-run the health check from Step 0a. If all ✅, proceed to Step 1.
If something still fails, print the specific error and ask user to fix.

For Claude Desktop: print `⚠️ Please restart Claude Desktop to apply MCP changes, then say "ok".`

#### 0c: User interaction principle

**The user should only interact for two things during the entire `/weekly-report` flow:**
1. **First-run setup** (Step 0b) — connect MCPs, restart app if needed. Only happens once.
2. **Approving the report** (Step 6-7) — review draft → send

Everything else (MCP installation, data fetching, drafting, sending, QA polling) is fully automated.

## Pipeline — run these steps IN ORDER

### Step 1: Check `gh` auth

Run via Bash:

```
gh auth status
```

If exit code is non-zero, or stderr mentions `not logged in`, print:

```
❌ gh not authenticated. Run 'gh auth login' and retry.
```

…and STOP.

### Step 2: Compute the window

Let:

- `W_start` = (current UTC timestamp) − `REPORT_WINDOW_DAYS` days, formatted as `YYYY-MM-DD`
- `W_end` = current UTC timestamp, formatted as `YYYY-MM-DD`

Remember `W_start` and `W_end` for all subsequent steps.

### Step 3: Fetch raw data from ALL sources

Fetch from three sources in order. **Keep all raw output in working memory — do not summarize yet.**

If any source fails, print a warning and continue to the next source. The report will note which sources were unavailable. Only STOP if ALL sources fail.

#### 3a: GitHub

Read and follow `references/fetch-github.md` — but substitute `{GITHUB_USERNAME}` with the value from `.env` (not hardcoded).

Summary of GitHub queries (substitute `{GITHUB_USERNAME}` and `{W_start}`):

```
gh search prs --author={GITHUB_USERNAME} --updated=">={W_start}" --json repository,number,title,state,url,updatedAt --limit 50
```

```
gh search issues --author={GITHUB_USERNAME} --updated=">={W_start}" --json repository,number,title,state,url,updatedAt --limit 50
```

```
gh api "search/commits?q=author:{GITHUB_USERNAME}+committer-date:>={W_start}" -H "Accept: application/vnd.github.cloak-preview+json"
```

Fallback for commits: `gh repo list --limit 100 --json nameWithOwner` then per-repo `gh api repos/<owner>/<repo>/commits?author={GITHUB_USERNAME}&since={W_start}`.

#### 3b: Slack

Read and follow `references/fetch-slack.md`.

Use Slack MCP tools (`mcp__plugin_slack_slack__slack_search_public_and_private`, `mcp__plugin_slack_slack__slack_read_channel`, `mcp__plugin_slack_slack__slack_read_thread`) to fetch the producer's messages and key discussions. If Slack MCP is not connected, fallback to `SLACK_USER_TOKEN` from `.env` with curl. If neither is available, skip with a warning.

#### 3c: Notion

Read and follow `references/fetch-notion.md`.

Use Notion MCP tools (`mcp__plugin_Notion_notion__notion-search`, `mcp__plugin_Notion_notion__notion-fetch`) to find and read meeting notes from the report window. If Notion MCP is not connected, skip with a warning.

### Step 4: Read the template

Read `references/report-template.md`. Follow its sections, order, and emojis exactly.

### Step 5: Draft the report

Compose the report following the template. Rules:

1. **Grounding (critical):** You may only reference items that appear verbatim in the Step 3 raw output (from ANY source — GitHub, Slack, or Notion). Every bullet must trace to raw data. **The TL;DR is also bound by this rule — do not invent claims about focus areas, themes, impact, or narrative that cannot be traced to fetched items.** If a field is missing, omit the bullet. **Do not invent anything. An empty section is always preferable to a fabricated one.**
2. **TL;DR is always present.** 2–3 sentences summarizing the week, drawing from ALL available sources (GitHub + Slack + Notion).
3. **`🚀 Shipped (GitHub)`** = merged PRs + closed issues. Omit section if none.
4. **`🛠 In Progress (GitHub)`** = open PRs + open issues. Omit section if none.
5. **`💬 Slack Highlights`** = key discussions, decisions, coordination from Slack channels. Each bullet includes `#channel-name`. Omit section if no Slack data or nothing notable.
6. **`📝 Meeting Notes (Notion)`** = key takeaways from meetings attended. Each bullet includes meeting title + date. Omit section if no Notion data or no meetings in window.
7. **`📌 Other Activity`** = OPTIONAL. Direct commits without PRs, other notable items. Omit if nothing worth noting.
8. **Source attribution:** Always include channel name for Slack (`#channel`), meeting title for Notion.
9. **Empty window:** if all sources returned zero items, TL;DR says `本週無活動紀錄。` and all other sections are omitted.
10. Replace `{START_DATE}` and `{END_DATE}` in the template with `W_start` and `W_end`.
11. **Source availability note:** If any source was skipped (Slack MCP disconnected, Notion MCP disconnected), add a line at the bottom: `⚠️ Note: {source} data was unavailable for this report.`

### Step 6: Show the approval gate

Print this block in chat, substituting real values:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Weekly Report — {W_start} to {W_end}

From: {GMAIL_USER}
To:   {REPORT_RECIPIENTS}
LINE: broadcast to all followers of @214lbnja
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<FULL DRAFT HERE>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

請選擇：
  [1] 送出（Email + LINE）
  [2] 修改（告訴我改哪裡）
  [3] 重新生成（同 data，重做 draft）
  [4] 取消
```

Then WAIT for the user's reply.

### Step 7: Handle the user's choice

| Input | Action |
|---|---|
| `1` / `送出` / `send` / `yes` | Go to Step 8 |
| `2 <instruction>` / `修改 <instruction>` | Apply edit → reprint Step 6 |
| bare `2` / bare `修改` | Ask `要改什麼？` → wait → apply → reprint Step 6 |
| `3` / `重新生成` | Re-draft from same raw data (no re-fetch) → reprint Step 6 |
| `4` / `取消` / `cancel` / `no` | Print `❌ Cancelled.` → STOP |
| `dry run` / `dry-run` | Print the draft that would be sent, then return to Step 6 |
| anything else | Print `我不確定你的意思 — 請選 1/2/3/4 或告訴我你想改什麼。` → WAIT |

**CRITICAL:** never auto-select option 1. When in doubt, ask.

### Step 8: Send to ALL configured channels

Send the approved report to every configured output channel. Each channel is independent — if one fails, continue to the next.

#### 8a: Email via Chrome DevTools MCP

Use **Chrome DevTools MCP** to send via Gmail in the user's existing Chrome browser (already logged in — no separate login needed).

1. `navigate_page` → `https://mail.google.com/mail/u/0/#inbox?compose=new`
2. `take_snapshot` to confirm compose window appeared
3. `fill` or `click` the **To** field → type each address from `REPORT_RECIPIENTS`
4. `fill` the **Subject** field → `Weekly Report — {W_start} to {W_end}`
5. `fill` the **Message Body** → the clean plain-text version of the draft
6. `click` the **Send** button

On success: print `✅ Email sent to {REPORT_RECIPIENTS}`
On failure: print error + `❌ Email send failed.`

If Chrome DevTools MCP is not connected, skip with: `⚠️ Chrome DevTools MCP not available. Skipping email.`

#### 8b: LINE via LINE Bot MCP

Use **LINE Bot MCP** (`mcp__line-bot__*` tools) to broadcast the report to all followers.

Use the broadcast tool to send the clean plain-text version of the draft as a text message. LINE text messages have a 5000 char limit — split at section boundaries if needed.

On success: print `✅ LINE broadcast sent to all followers`
On failure: print error.

If LINE Bot MCP is not connected, skip with: `⚠️ LINE Bot MCP not available. Skipping LINE delivery.`

### Step 9: Summary

After all channels have been attempted, print a final summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Delivery Summary
  Email: ✅ / ❌
  LINE:  ✅ / ❌ / ⚠️ not configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 10: Start inbound Q&A auto-polling

After the report is sent, automatically start a cron job that checks for replies every 30 minutes. This runs in the current session only — when the user closes Claude Code, the polling stops.

Use the `CronCreate` tool with these parameters:

- **cron:** `17 * * * *` (every hour at :17 — avoids :00/:30 congestion. For testing, user can request `* * * * *` for every minute)
- **recurring:** true
- **durable:** false (session-only — stops when session closes)
- **prompt:**

```
Automated Q&A check for weekly-report skill.

Read .env for config. Check for inbound questions:

1. EMAIL: Use Chrome DevTools MCP to open Gmail and search for unread replies with subject containing "Re: Weekly Report". For each reply, read the question, compose a grounded answer using GitHub/Slack/Notion data (re-fetch if needed), and reply via Gmail. Follow references/inbound-qa-email.md.

2. LINE: Use LINE Bot MCP to check for and reply to messages. Follow references/inbound-qa-line.md.

Grounding rules: only reference items from raw data. Never fabricate. If you cannot answer, say so honestly.
If any MCP is not available, skip that channel with a warning.
Be autonomous — do not ask for confirmation.
Print a summary at the end.
```

After creating the cron job, print:

```
🔄 Inbound Q&A auto-polling started (every hour at :17).
   Checks: Gmail replies + LINE messages
   Stops when: this session closes
   Manual check: /weekly-report-qa
   Cancel: tell me "stop qa polling"
```

If the user says "stop qa polling" at any point, use `CronDelete` to remove the job.

## Hard rules (never break)

1. Never send without explicit `1` / `送出` / `send` / `yes` at the approval gate.
2. Never reference items not in the Step 3 raw output. Grounding applies to ALL sources.
3. Never skip Step 1 (`gh auth` check).
4. Never re-fetch during regenerate (option 3). Use cached raw data.
5. When approval-gate input is ambiguous, ask — never guess.
6. Never hardcode config values. Always read from `.env`.
