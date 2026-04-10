---
name: weekly-report
description: Generate and send a weekly report email summarizing the producer's GitHub activity (PRs, issues, commits) from the past 7 days. Use when the user asks for "weekly report", "週報", "my week in review", or similar. Drafts the email against a fixed template, shows it in chat for explicit approval, and only sends after the user picks "送出".
---

# Weekly Report Skill

Produce a weekly report of Ryan's GitHub activity for the last 7 days and send it via Mail.app to a fixed recipient, with a mandatory approval gate in Claude Code chat before any email is sent.

## Hardcoded configuration

These values are fixed for MVP:

- **Producer GitHub username:** `ryanlinjui`
- **From (sender):** `a02733613424@gmail.com` (via Playwright driving Gmail web)
- **To (recipient):** `ryanlinjui@gmail.com`
- **Window:** last 7 days, ending at the current UTC timestamp

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

…and STOP. Do not continue to Step 2.

### Step 2: Compute the window

Let:

- `W_start` = (current UTC timestamp) − 7 days, formatted as `YYYY-MM-DD`
- `W_end` = current UTC timestamp, formatted as `YYYY-MM-DD`

Remember `W_start` and `W_end` — you will substitute them into Step 3 commands, Step 6 output, and the Step 8 send command.

### Step 3: Fetch raw GitHub activity via Bash

Run these three commands. **Keep the raw JSON output in your working memory — do not summarize or drop fields yet.** Substitute `{W_start}` with the value from Step 2.

```
gh search prs --author=ryanlinjui --updated=">={W_start}" --json repository,number,title,state,url,updatedAt --limit 50
```

```
gh search issues --author=ryanlinjui --updated=">={W_start}" --json repository,number,title,state,url,updatedAt --limit 50
```

```
gh api "search/commits?q=author:ryanlinjui+committer-date:>={W_start}" -H "Accept: application/vnd.github.cloak-preview+json"
```

**Fallback** if the `gh api search/commits` call fails with a rate-limit error (HTTP 403 or body `{"message": "API rate limit ..."}`) or a preview-API error:

```
gh repo list --limit 100 --json nameWithOwner
```

Then for each `<owner>/<repo>` returned:

```
gh api "repos/<owner>/<repo>/commits?author=ryanlinjui&since={W_start}"
```

If the fallback also fails, print the error verbatim and STOP. Do not draft on partial data.

### Step 4: Read the template

Read the file `references/report-template.md` (relative to this SKILL.md). It is your output structure. You MUST follow its sections, order, and emojis exactly.

### Step 5: Draft the report

Compose the report following the template. Rules:

1. **Grounding (critical):** You may only reference issues, PRs, commits, repo names, titles, and URLs that appear verbatim in the Step 3 raw output. Every bullet must trace to raw data. **The TL;DR is also bound by this rule — you may only characterize work that is represented in the raw data. Do not invent claims about focus areas, themes, impact, or week-level narrative that cannot be traced to the fetched items.** If a field is missing, omit the bullet. **Do not invent anything. An empty section is always preferable to a fabricated one.**
2. **TL;DR is always present.** 2–3 sentences summarizing the week's focus and outputs.
3. **`🚀 Shipped`** = merged PRs + closed issues from the raw data. Omit the entire section if there are none.
4. **`🛠 In Progress`** = open PRs + open issues. Omit the entire section if there are none.
5. **`📌 Other Activity`** = OPTIONAL. Include only if there are direct commits (from Step 3 commits query) that are not tied to a listed PR and are worth mentioning. Omit otherwise.
6. **Empty window:** if Step 3 returned zero items across all three queries, TL;DR says exactly `本週無 GitHub activity。` and all other sections are omitted.
7. Replace `{START_DATE}` and `{END_DATE}` in the template with the actual `W_start` and `W_end` ISO dates.

### Step 6: Show the approval gate

Print this block verbatim in the chat, substituting `{W_start}`, `{W_end}`, and `<FULL DRAFT MARKDOWN HERE>` with the real values:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Weekly Report — {W_start} to {W_end}

From: a02733613424@gmail.com
To:   ryanlinjui@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<FULL DRAFT MARKDOWN HERE>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

請選擇：
  [1] 送出
  [2] 修改（告訴我改哪裡，例如「把 TL;DR 第二句拿掉」)
  [3] 重新生成（同 data，重做 draft)
  [4] 取消
```

Then WAIT for the user's reply. Do not proceed until they respond.

### Step 7: Handle the user's choice

| Input                                       | Action |
|---|---|
| `1` / `送出` / `send` / `yes`                | Go to Step 8 (send) |
| `2 <instruction>` / `修改 <instruction>`     | Apply the natural-language edit to the draft, then go back to Step 6 (reprint the approval gate) |
| bare `2` / bare `修改` (no instruction)      | Ask `要改什麼？`, wait for the user's reply, apply, then go back to Step 6 |
| `3` / `重新生成`                              | Re-draft from the **same raw data from Step 3** (do NOT re-run the `gh` commands), then go back to Step 6 |
| `4` / `取消` / `cancel` / `no`               | Print `❌ Cancelled. No email sent.` and STOP |
| `dry run` / `dry-run`                        | Go to Step 8, but append `--dry-run` to the `send_mail.py` call. After the dry-run output prints, return to Step 6 so the user can still choose to really send |
| anything else                                | Print `我不確定你的意思 — 請選 1/2/3/4 或告訴我你想改什麼。` and WAIT again |

**CRITICAL:** never auto-select option 1. When in doubt, ask.

### Step 8: Send

Use the **Playwright MCP tools** to send the email via Gmail web. This is cross-platform (no macOS dependency) and doesn't require SMTP credentials or App Passwords.

If the user chose `dry run` in Step 7, **skip this entire step** — just print the draft and return to Step 6. Do not open the browser.

**Playwright send sequence:**

1. `browser_navigate` → `https://mail.google.com/mail/u/0/#inbox?compose=new`
2. Wait for the compose window to appear (use `browser_snapshot` to confirm)
3. `browser_type` into the **To** field → `ryanlinjui@gmail.com` (then press Enter to confirm the recipient)
4. `browser_type` into the **Subject** field → `Weekly Report — {W_start} to {W_end}`
5. `browser_type` into the **Message Body** field → the clean plain-text version of the draft (strip markdown syntax: no `#`, `**`, or `-` bullets — use the same format shown in the approval gate)
6. `browser_click` the **Send** button

On **successful send** (compose window closes, back to inbox): print `✅ Sent to ryanlinjui@gmail.com via Gmail`

On **failure** (compose window still open, or error): take a `browser_snapshot`, print the error, and `❌ Send failed. Draft preserved — you can try again.` Leave the draft in conversation context so the user can ask you to retry.

**Important:** The Gmail account `a02733613424@gmail.com` must already be logged in on the Playwright browser. If Gmail shows a login page instead of the inbox, tell the user to log in manually and retry.

## Hard rules (never break)

1. Never send email without explicit `1` / `送出` / `send` / `yes` input from the user at the approval gate.
2. Never write repo names, issue/PR numbers, titles, or URLs that do not appear verbatim in the Step 3 raw output.
3. Never skip Step 1 (`gh auth` check).
4. Never re-fetch in Step 3 during a regenerate (Step 7 option `3`). Use the raw data already in your working memory.
5. When the user's approval-gate input is ambiguous, ask — never guess.
