# Weekly Report Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `weekly-report` skill MVP per the 2026-04-08 design spec so it can be demoed end-to-end at the 2026-04-09 founder meeting.

**Architecture:** Hybrid SKILL.md runbook. Claude Code loads the skill, runs a deterministic pipeline via the Bash tool (`gh` for data fetch, `python3` wrapper for email send), but drafts the report content with LLM reasoning against a fixed template. Single Python wrapper (`send_mail.py`) exists only to shield multi-line markdown from osascript escaping.

**Tech Stack:**
- Claude Code (skill runtime, Bash tool)
- agentskills.io SKILL.md format
- `gh` CLI (already authenticated on the target Mac)
- Python 3 stdlib only (argparse, subprocess, pathlib) — no pip deps
- `osascript` driving macOS Mail.app (already configured with `ryanlinjui@gitroll.io`)

**Source of truth:** `docs/superpowers/specs/2026-04-08-weekly-report-skill-design.md`

---

## File Structure

All work happens in this repo root:
`/Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/`

Files created by this plan:

| Path | Purpose | Approx size |
|---|---|---|
| `.claude/skills/weekly-report/scripts/send_mail.py` | Python wrapper that builds + runs the osascript send command. Supports `--dry-run`. | ~70 lines |
| `.claude/skills/weekly-report/references/report-template.md` | Fixed report section structure that Claude follows when drafting. | ~20 lines |
| `.claude/skills/weekly-report/SKILL.md` | The runbook — agentskills.io frontmatter + pipeline instructions + grounding rules. | ~150 lines |
| `.claude/commands/weekly-report.md` | Slash command wrapper for explicit invocation (`/weekly-report`). | ~5 lines |

No test framework is set up — the spec's Non-Goals section waives unit tests (spec §Non-Goals). Verification is inline per task: run the artifact, assert observable behavior.

Build order is bottom-up by dependency: `send_mail.py` first (can be verified in isolation), then `report-template.md` (data, no logic), then `SKILL.md` (depends on the two above), then the slash command wrapper (depends on SKILL.md), then full end-to-end verification.

---

## Task 1: Build `send_mail.py` with dry-run and real-send paths

**Files:**
- Create: `.claude/skills/weekly-report/scripts/send_mail.py`

**Context:** This is the only piece of executable code in the skill. It wraps `osascript` so that Claude (via the SKILL.md pipeline) can hand off multi-line markdown bodies via a temp file instead of argv. Dry-run mode exists so we can exercise the full pipeline without spamming the recipient during testing. Per the spec, AppleScript string escaping must handle backslashes and double quotes in both order (backslash first or double-escape happens).

- [ ] **Step 1: Create the directory and write the complete script**

Run first:
```
mkdir -p /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/skills/weekly-report/scripts
```

Then create `.claude/skills/weekly-report/scripts/send_mail.py` with exactly this content:

```python
#!/usr/bin/env python3
"""Send an email via macOS Mail.app using osascript.

Used by the weekly-report skill. Takes the body as a file path (not argv)
to avoid shell escaping issues with multi-line markdown.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def build_applescript(sender: str, recipient: str, subject: str, body: str) -> str:
    """Build the osascript source that sends via Mail.app.

    Escapes backslashes first, then double quotes, for AppleScript string literals.
    """
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace('"', '\\"')

    sender_e = esc(sender)
    recipient_e = esc(recipient)
    subject_e = esc(subject)
    body_e = esc(body)

    return (
        f'tell application "Mail"\n'
        f'    set newMessage to make new outgoing message with properties '
        f'{{subject:"{subject_e}", content:"{body_e}", sender:"{sender_e}", visible:false}}\n'
        f'    tell newMessage\n'
        f'        make new to recipient at end of to recipients '
        f'with properties {{address:"{recipient_e}"}}\n'
        f'    end tell\n'
        f'    send newMessage\n'
        f'end tell'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Send email via macOS Mail.app")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument(
        "--from",
        dest="sender",
        required=True,
        help="Sender email (must be a configured Mail.app account)",
    )
    parser.add_argument("--subject", required=True, help="Email subject line")
    parser.add_argument(
        "--body-file",
        required=True,
        help="Path to a file containing the email body (utf-8)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the osascript that would be executed and exit without sending",
    )
    args = parser.parse_args()

    body_path = Path(args.body_file)
    if not body_path.is_file():
        print(f"error: body-file not found: {args.body_file}", file=sys.stderr)
        return 1

    body = body_path.read_text(encoding="utf-8")
    script = build_applescript(args.sender, args.to, args.subject, body)

    if args.dry_run:
        print("=== DRY RUN: osascript that would be executed ===")
        print(script)
        print("=== END DRY RUN ===")
        return 0

    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stderr or result.stdout or "osascript failed", file=sys.stderr)
        return 1

    print(f"OK {datetime.now().isoformat(timespec='seconds')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Verify dry-run output format**

Run these commands from the repo root:

```
cd /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report
mkdir -p /tmp/weekly-report-test
cat > /tmp/weekly-report-test/body.md <<'EOF'
# Weekly Report — 2026-04-01 to 2026-04-08

## TL;DR
Test body with "double quotes" and a backslash \ inside.

## 🚀 Shipped
- foo/bar: Test PR (#1)
EOF

python3 .claude/skills/weekly-report/scripts/send_mail.py \
  --to test@example.com \
  --from ryanlinjui@gitroll.io \
  --subject "Test Subject" \
  --body-file /tmp/weekly-report-test/body.md \
  --dry-run
```

Expected: exit code 0 and stdout contains:
- `=== DRY RUN: osascript that would be executed ===`
- `tell application "Mail"`
- `subject:"Test Subject"`
- `sender:"ryanlinjui@gitroll.io"`
- `address:"test@example.com"`
- Body content with escaped double quotes: `\"double quotes\"`
- Body content with escaped backslash: `\\`
- `=== END DRY RUN ===`

If the escape assertions fail, the escape order in `build_applescript()` is wrong — backslashes must be escaped before double quotes. Fix inline and re-run.

- [ ] **Step 3: Verify real send works end-to-end**

This is the only reliable way to catch Mail.app configuration issues (wrong sender account, missing permissions). Do it now so the SKILL.md can be built with confidence.

Run (note: this sends a real email to yourself):

```
python3 .claude/skills/weekly-report/scripts/send_mail.py \
  --to ryanlinjui@gmail.com \
  --from ryanlinjui@gitroll.io \
  --subject "send_mail.py smoke test $(date +%H:%M:%S)" \
  --body-file /tmp/weekly-report-test/body.md
```

Expected:
- exit code 0
- stdout starts with `OK ` followed by an ISO timestamp
- An email arrives in ryanlinjui@gmail.com within ~30 seconds
- Subject matches; body renders with the template sections

If `osascript` prints a permission error (Mail.app automation not authorized), grant permission in System Settings → Privacy & Security → Automation, then re-run.

- [ ] **Step 4: Clean up test artifacts**

```
rm -rf /tmp/weekly-report-test
```

- [ ] **Step 5: Commit**

```
git add .claude/skills/weekly-report/scripts/send_mail.py
git commit -m "$(cat <<'EOF'
Add send_mail.py wrapper for weekly-report skill

Python wrapper around osascript that handles multi-line markdown
body via --body-file, with --dry-run mode for pre-send verification.
Escapes backslashes then double quotes for AppleScript string literals.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create `report-template.md`

**Files:**
- Create: `.claude/skills/weekly-report/references/report-template.md`

**Context:** A fixed structural skeleton Claude reads at draft time. Claude fills sections based on raw `gh` output — this file defines which sections exist, their order, and the emojis. Section omission rules live in SKILL.md, not here. `{START_DATE}` and `{END_DATE}` are placeholders the drafting step replaces with ISO dates.

- [ ] **Step 1: Create the directory and file**

```
mkdir -p /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/skills/weekly-report/references
```

Create `.claude/skills/weekly-report/references/report-template.md` with exactly this content:

```markdown
# Weekly Report — {START_DATE} to {END_DATE}

## TL;DR
<2-3 sentences summarizing the week's focus and main outputs>

## 🚀 Shipped
<Merged PRs and closed issues — one bullet each>
- <repo>: <title> (#<number>)

## 🛠 In Progress
<Open PRs and active issues — one bullet each, with short status>
- <repo>: <title> (#<number>) — <status inferred from latest activity>

## 📌 Other Activity
<Direct commits without PRs, notable discussions — OPTIONAL, omit entire section if nothing worth noting>

---
*Generated by weekly-report skill · window: {START_DATE} → {END_DATE}*
```

- [ ] **Step 2: Verify the file**

Run:
```
cat /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/skills/weekly-report/references/report-template.md
```

Expected: the file prints with all four sections (`TL;DR`, `🚀 Shipped`, `🛠 In Progress`, `📌 Other Activity`), the footer line with `Generated by weekly-report skill`, and the `{START_DATE}` / `{END_DATE}` placeholders present in both title and footer.

- [ ] **Step 3: Commit**

```
git add .claude/skills/weekly-report/references/report-template.md
git commit -m "$(cat <<'EOF'
Add report-template.md for weekly-report skill

Fixed section structure (TL;DR / Shipped / In Progress / Other Activity)
that Claude follows when drafting the report. Placeholders will be
replaced with ISO dates at draft time.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create `SKILL.md` — the runbook

**Files:**
- Create: `.claude/skills/weekly-report/SKILL.md`

**Context:** This is the core of the skill — the instructions Claude Code loads and executes. It must: (a) have YAML frontmatter with `name` and `description` for auto-discovery, (b) enumerate the pipeline steps in order, (c) include the `gh` commands as copy-paste-ready hints, (d) include the grounding rule verbatim to prevent content fabrication, (e) specify the approval-gate interaction exactly, and (f) have hard rules about never auto-sending. All content here must match the spec — when in doubt, defer to `docs/superpowers/specs/2026-04-08-weekly-report-skill-design.md`.

- [ ] **Step 1: Create `SKILL.md`**

Create `.claude/skills/weekly-report/SKILL.md` with exactly this content:

````markdown
---
name: weekly-report
description: Generate and send a weekly report email summarizing the producer's GitHub activity (PRs, issues, commits) from the past 7 days. Use when the user asks for "weekly report", "週報", "my week in review", or similar. Drafts the email against a fixed template, shows it in chat for explicit approval, and only sends after the user picks "送出".
---

# Weekly Report Skill

Produce a weekly report of Ryan's GitHub activity for the last 7 days and send it via Mail.app to a fixed recipient, with a mandatory approval gate in Claude Code chat before any email is sent.

## Hardcoded configuration

These values are fixed for MVP:

- **Producer GitHub username:** `ryanlinjui`
- **From (sender):** `ryanlinjui@gitroll.io`
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

From: ryanlinjui@gitroll.io
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

**Use the Write tool** (NOT `echo`/heredoc via Bash — those will corrupt markdown that contains backticks, dollar signs, or quotes) to write the current draft markdown to this temp file path:

```
/tmp/weekly-report-{W_end}.md
```

Then run via Bash (add `--dry-run` at the end only if the user chose `dry run` in Step 7):

```
python3 .claude/skills/weekly-report/scripts/send_mail.py \
  --to ryanlinjui@gmail.com \
  --from ryanlinjui@gitroll.io \
  --subject "Weekly Report — {W_start} to {W_end}" \
  --body-file /tmp/weekly-report-{W_end}.md
```

On **exit code 0 (real send)**: print `✅ Sent to ryanlinjui@gmail.com at HH:MM:SS` using the time from the script's `OK <timestamp>` line.

On **exit code 0 (dry run)**: print the full dry-run output from stdout, then return to Step 6.

On **exit code non-zero**: print the captured stderr verbatim, followed by `❌ Send failed. Draft preserved — you can try again.` Leave the draft in conversation context so the user can ask you to retry.

## Hard rules (never break)

1. Never send email without explicit `1` / `送出` / `send` / `yes` input from the user at the approval gate.
2. Never write repo names, issue/PR numbers, titles, or URLs that do not appear verbatim in the Step 3 raw output.
3. Never skip Step 1 (`gh auth` check).
4. Never re-fetch in Step 3 during a regenerate (Step 7 option `3`). Use the raw data already in your working memory.
5. When the user's approval-gate input is ambiguous, ask — never guess.
````

- [ ] **Step 2: Verify the file**

Run:
```
wc -l /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/skills/weekly-report/SKILL.md
head -5 /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/skills/weekly-report/SKILL.md
```

Expected:
- Line count is roughly 140-170 lines
- First 5 lines are:
  ```
  ---
  name: weekly-report
  description: Generate and send a weekly report email summarizing...
  ---
  
  ```

The frontmatter must be valid YAML with `name:` and `description:` fields — if not, Claude Code will not auto-discover the skill.

- [ ] **Step 3: Commit**

```
git add .claude/skills/weekly-report/SKILL.md
git commit -m "$(cat <<'EOF'
Add SKILL.md runbook for weekly-report skill

Pipeline in 8 steps: gh auth check → window calc → fetch PRs/issues/commits
→ read template → draft with grounding rule → approval gate → handle choice
→ send via send_mail.py. Approval gate is mandatory; grounding rule
forbids fabricated content.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create the slash command wrapper

**Files:**
- Create: `.claude/commands/weekly-report.md`

**Context:** Slash commands in Claude Code are prompt templates — typing `/weekly-report` inserts the file's body as the user's prompt. This wrapper exists purely for demo polish: it gives the founder meeting a clean one-token invocation. The wrapper's body just needs to ask Claude to run the skill; Claude Code will match the prompt against the SKILL.md `description` field and auto-load the skill.

- [ ] **Step 1: Create the directory and file**

```
mkdir -p /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/commands
```

Create `.claude/commands/weekly-report.md` with exactly this content:

```markdown
---
description: Generate and send Ryan's weekly report from GitHub activity
---

Run the `weekly-report` skill to generate and send my weekly report email. Follow the skill's pipeline exactly — especially the approval gate at Step 6 — and do not send anything until I confirm.
```

- [ ] **Step 2: Verify the file**

Run:
```
cat /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report/.claude/commands/weekly-report.md
```

Expected: frontmatter block with `description:` line, followed by a prompt body that references the `weekly-report` skill and the approval gate.

- [ ] **Step 3: Commit**

```
git add .claude/commands/weekly-report.md
git commit -m "$(cat <<'EOF'
Add /weekly-report slash command wrapper

Thin prompt wrapper that invokes the weekly-report skill, for clean
one-token invocation during the founder meeting demo.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Pre-demo end-to-end verification

**Files:** none created — this task runs the skill against real data and checks observable behavior.

**Context:** This is the final gate before the founder meeting. Spec §Pre-demo Verification Plan lists five checks. We run all of them here, in order, and stop at the first failure to diagnose. Do not skip steps even if earlier ones passed — Mail.app behavior in particular can be flaky.

- [ ] **Step 1: Skeleton check**

Run:
```
cd /Users/ryanlinjui/Desktop/Projects/agent-backend-weekly-report
ls -la .claude/skills/weekly-report/SKILL.md \
       .claude/skills/weekly-report/references/report-template.md \
       .claude/skills/weekly-report/scripts/send_mail.py \
       .claude/commands/weekly-report.md
```

Expected: all four files listed, non-zero sizes, no "No such file" errors.

- [ ] **Step 2: `gh auth` sanity check**

Run:
```
gh auth status
```

Expected: output contains `Logged in to github.com` with the account `ryanlinjui`. If this fails, resolve via `gh auth login` before continuing — the skill will otherwise fail at Step 1 of its pipeline.

- [ ] **Step 3: Standalone dry-run of `send_mail.py`**

Run:
```
mkdir -p /tmp/weekly-report-verify
cat > /tmp/weekly-report-verify/body.md <<'EOF'
# Weekly Report — 2026-04-01 to 2026-04-08

## TL;DR
Pre-demo verification smoke test.

## 🚀 Shipped
- test/repo: verification PR (#1)
EOF

python3 .claude/skills/weekly-report/scripts/send_mail.py \
  --to ryanlinjui@gmail.com \
  --from ryanlinjui@gitroll.io \
  --subject "Verify dry-run" \
  --body-file /tmp/weekly-report-verify/body.md \
  --dry-run
```

Expected: exit 0, output includes `=== DRY RUN: osascript that would be executed ===` and the script body with correctly escaped content. If this fails, diagnose `send_mail.py` — do not advance.

- [ ] **Step 4: Skill discovery — slash command**

Open a fresh Claude Code session in this repo. Type `/weekly-report` and press enter.

Expected: Claude acknowledges the command, loads the `weekly-report` skill (you will see it reference the skill or its pipeline steps), and begins executing Step 1 (`gh auth status`). If Claude does not recognize the skill, check `.claude/commands/weekly-report.md` and SKILL.md frontmatter.

- [ ] **Step 5: Skill discovery — natural language**

In the same or a new fresh session, type: `幫我產生這週的 weekly report`

Expected: Claude auto-discovers the `weekly-report` skill based on its frontmatter `description`, loads it, and begins executing the pipeline. This confirms the description field is well-tuned for matching.

- [ ] **Step 6: Full dry-run end-to-end**

In one of the fresh sessions from Step 4/5, let the skill run until the approval gate appears (Step 6 of its pipeline). At the approval gate, type: `dry run`

Expected: Claude runs `send_mail.py` with `--dry-run`, prints the resulting osascript, then returns to the approval gate. Verify:
- The subject contains `Weekly Report — YYYY-MM-DD to YYYY-MM-DD` with real dates.
- From is `ryanlinjui@gitroll.io`, To is `ryanlinjui@gmail.com`.
- The body contains the draft sections with real repo names / PR numbers from Ryan's actual GitHub activity (not placeholders).

- [ ] **Step 7: Real send end-to-end**

Still at the approval gate, type: `1`

Expected:
- `✅ Sent to ryanlinjui@gmail.com at HH:MM:SS` prints in chat
- Within 30 seconds, an email arrives at `ryanlinjui@gmail.com`
- Subject and body match what was shown at the approval gate
- Sender shows as `ryanlinjui@gitroll.io`

- [ ] **Step 8: Cleanup**

```
rm -rf /tmp/weekly-report-verify
```

- [ ] **Step 9: Record verification success**

If all steps 1-7 passed, the MVP is demo-ready. If any step failed, do NOT proceed to the founder meeting until the specific failure is resolved and the step re-run successfully.

No commit in this task — verification doesn't produce new artifacts. If any debugging fix is needed, commit that fix separately with a clear message referencing which verification step it fixed.

---

## Post-implementation handoff

After Task 5 passes, the skill is ready for the 2026-04-09 founder meeting. The spec's Open Questions section lists the next-week work: Slack/Notion sources, LINE channel, inbound Q&A, scheduling, multi-recipient — those require a new spec and plan cycle.
