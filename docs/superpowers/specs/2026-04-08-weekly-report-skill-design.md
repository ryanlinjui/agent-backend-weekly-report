# Weekly Report Skill — MVP Design

- **Date:** 2026-04-08
- **Author:** Ryan Lin (producer)
- **Status:** Approved for implementation
- **Parent task:** [PRO-227 — Agent Skills as Backend — Internal PoC](https://www.notion.so/33c0b700541e81c1a278cccd8f385077)
- **Milestone:** Skeleton running and ideally one e2e run by Thu 2026-04-09 founder meeting

## Context

PRO-227 validates "agent-as-backend via agentskills.io" on a GitRoll-internal use case before next-week H2S/WTW customer visit. Two framing options existed: **Option A — Weekly Report** (internal, email/LINE, easier, API-driven) and **Option B — LinkedIn Personal Branding** (external, browser automation, harder). We picked **Option A** because it is faster to validate and maps to the IR-style customer PoCs (H2S CFO IR Agent, WTW Quoting chatbot).

Runtime is **Claude Code** loading SKILL.md files per the [agentskills.io specification](https://agentskills.io/specification). This is distinct from the "Architecture C" pattern in the [Agent-as-Backend Research Brief](https://www.notion.so/33c0b700541e81eeaff3dc2d48502fe9) which uses `claude_agent_sdk` + MCP servers in a Python process — the customer deployment constraint (Claude personal $20/mo) requires Claude Code / Claude desktop as the runtime, so the PoC must match.

The MVP in this document is a deliberately minimal slice chosen for the **< 24 hour** timeline to the founder meeting. Real e2e (full sources, LINE, inbound Q&A, scheduling) is scoped for the following week.

## Goals

1. A working `weekly-report` skill bundle in `.claude/skills/weekly-report/` that Claude Code auto-discovers.
2. One end-to-end run demonstrable at the 2026-04-09 founder meeting: invoke → fetch GitHub data → draft report → approval gate in Claude Code chat → send email.
3. Pitch-aligned: the skill is a **runbook for the agent**, not a wrapper around a Python script. The agent performs the work (fetch, synthesize, draft, deliver); the skill provides structure and guardrails.
4. Forward-compatible: MVP files become the base of the next-week real e2e without rewrite.

## Non-Goals (MVP)

Explicitly out of scope for the founder-meeting MVP:

- Sources beyond GitHub (Slack, Notion, Gmail inbound are next-week)
- Channels beyond Email (LINE is next-week)
- Inbound Q&A auto-reply (Email/LINE inbound is next-week — the hardest block)
- Scheduling (cron, Claude Code scheduled — next-week decision)
- Multi-recipient routing to Wei / Luyi / Charles
- Config file externalization (hardcoded recipient is fine)
- HTML email (plain-text markdown only)
- Retry / caching / logging / i18n — YAGNI
- Unit tests — the Python wrapper is ~30 lines, osascript is a system call

## Architecture

### Execution Model

Claude Code is the runtime. The user invokes the skill (via natural language or the slash command wrapper). Claude Code loads `SKILL.md`, which instructs Claude through a deterministic pipeline. Claude uses its built-in Bash tool to call `gh` directly (no fetch wrapper), reads `references/report-template.md` for structure, drafts the report with LLM reasoning, shows it in chat for user approval, and on confirm invokes `scripts/send_mail.py` to deliver the email via Mail.app.

The skill is **hybrid**: pipeline is deterministic (same steps every run), but content generation is agent-driven (Claude decides what to say based on raw data and template). The only script wrapper is `send_mail.py`, which exists solely because osascript string escaping for multi-line markdown is a reliability trap.

### File Layout

```
agent-backend-weekly-report/
└── .claude/
    ├── commands/
    │   └── weekly-report.md          # slash command wrapper, ~5 lines
    └── skills/
        └── weekly-report/
            ├── SKILL.md              # runbook: goal + pipeline + command hints + grounding rules
            ├── references/
            │   └── report-template.md  # fixed section structure for the report
            └── scripts/
                └── send_mail.py      # osascript wrapper, ~30 lines Python
```

**Responsibilities:**

| File | Written by | Read at | Responsibility |
|---|---|---|---|
| `.claude/commands/weekly-report.md` | human (once) | Claude Code on `/weekly-report` | Explicit invocation surface for demo |
| `SKILL.md` | human (once) | Claude Code on skill load | Tell Claude the goal, steps, gh command hints, approval gate behavior, grounding rules |
| `references/report-template.md` | human (once) | Claude during draft step | Fixed section structure — sections, order, emojis — so output shape is stable run-to-run |
| `scripts/send_mail.py` | human (once) | Claude at send step | Wrap `osascript` Mail.app send, handle `--dry-run`, return exit code |

### Invocation

Two entry points, both trigger the same skill:

1. **Natural language:** user types "generate my weekly report" (or similar) → Claude Code matches the skill's frontmatter description → loads `SKILL.md`.
2. **Slash command:** user types `/weekly-report` → `.claude/commands/weekly-report.md` wrapper explicitly invokes the skill.

The slash command is included purely for demo polish — it makes the founder-meeting invocation clean.

## Data Flow (Pipeline)

```
[User invokes skill in Claude Code]
        ↓
 Step 1: Claude Code auto-loads SKILL.md on trigger
        ↓
 Step 2: Claude computes window = last 7 days ending now, i.e.
         W_start = (current UTC timestamp) - 7 days
         W_end   = current UTC timestamp
         Both rendered as absolute ISO dates for the gh queries.
        ↓
 Step 3: Claude checks `gh auth status` — if fail, error out immediately
        ↓
 Step 4: Claude runs gh queries via Bash tool:
         - gh search prs    --author=ryanlinjui --updated=">=W"
         - gh search issues --author=ryanlinjui --updated=">=W"
         - gh search commits (preview API) author:ryanlinjui committer-date:>=W
         (fallback path documented in SKILL.md — see Error Handling)
        ↓
 Step 5: Claude reads references/report-template.md + raw gh output
        ↓
 Step 6: Claude drafts the report, strictly following template sections,
         grounded only in raw data (no invented items)
        ↓
 Step 7: Claude prints the approval gate in chat (see UX below)
        ↓
 Step 8: User chooses 1/2/3/4
         - 1 → Claude calls scripts/send_mail.py → prints confirmation
         - 2 → Claude applies the edit → loop back to Step 7
         - 3 → Claude re-drafts from the SAME raw data (no re-fetch) → loop to Step 7
         - 4 → Claude acknowledges cancellation, stops
```

**Key design choices:**

1. **Claude uses Bash tool directly for `gh`** — no fetch wrapper script. Claude Code's Bash tool already works with the user's `gh auth` state, so a wrapper adds files with zero value.
2. **`references/report-template.md` is a structural skeleton, not a Jinja template** — Claude reads it as a reference the way a human reads a style guide, then writes content that matches the skeleton.
3. **`send_mail.py` is the only wrapper** — justified because osascript escaping multi-line markdown is fragile; a Python subprocess handles it safely.
4. **Regenerate (option 3) does not re-fetch** — uses the raw data already in context, saving time and avoiding rate limits. If the user wants a fresh fetch, they cancel and re-invoke.

## Report Template

`references/report-template.md`:

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

**SKILL.md will instruct Claude:**

- Follow template sections exactly: names, order, emojis.
- If a section has nothing to report, omit it — except `TL;DR`, which is always present.
- When there is no activity in the window at all, TL;DR says `本週無 GitHub activity。` and all other sections are omitted.

## Email Metadata

| Field | Value |
|---|---|
| **From** | `ryanlinjui@gitroll.io` (Mail.app default sender for this account) |
| **To** | `ryanlinjui@gmail.com` (hardcoded for demo) |
| **Subject** | `Weekly Report — {YYYY-MM-DD} to {YYYY-MM-DD}` |
| **Body** | Markdown as plain text. Gmail renders headers / bold passably; HTML conversion is deferred to the next-week version to avoid osascript escaping traps. |

## Approval Gate UX

At Step 7, Claude prints this block in the Claude Code chat:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Weekly Report — 2026-04-01 to 2026-04-08

From: ryanlinjui@gitroll.io
To:   ryanlinjui@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<full draft markdown rendered inline>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

請選擇：
  [1] 送出
  [2] 修改（告訴我改哪裡，例如「把 TL;DR 第二句拿掉」)
  [3] 重新生成（同 data，重做 draft)
  [4] 取消
```

**Interaction rules:**

| Input | Action |
|---|---|
| `1` / `送出` / `send` / `yes` | Call `scripts/send_mail.py` → print `✅ Sent to ryanlinjui@gmail.com at HH:MM:SS` |
| `2 <instruction>` / `修改 <instruction>` | Apply natural-language edit → reprint the approval block → wait again |
| bare `2` / bare `修改` (no instruction) | Ask "要改什麼？" → user replies → Claude applies → reprint → wait again |
| `3` / `重新生成` | Re-draft from SAME raw data (no re-fetch) → reprint the approval block → wait again |
| `4` / `取消` / `cancel` / `no` | Print `❌ Cancelled. No email sent.` → stop |
| anything else | Reprint: "I'm not sure — please choose 1/2/3/4, or tell me what to change" |

**Critical rule:** Claude MUST NOT default to option 1 when input is ambiguous. Accidental sends are the worst failure mode here.

## Error Handling

Only the failures that can actually happen get handled:

| Failure point | Detection | Claude action |
|---|---|---|
| **`gh auth status` not logged in** | Step 3 check; stderr contains "not logged in" | Print `❌ gh not authenticated. Run 'gh auth login' and retry.` → stop |
| **`gh search` rate limit / API error** | Non-zero exit or `{"message": "API rate limit..."}` response | Fallback: `gh repo list --limit 100` → for each `<owner>/<repo>` in the result, call `gh api repos/<owner>/<repo>/commits?author=ryanlinjui&since=<W_start>`. If fallback also fails, print the error and stop. |
| **Empty data (no activity in window)** | Raw output has zero items across all queries | **Not an error.** Draft TL;DR says `本週無 GitHub activity。`, all other sections omitted. User decides whether to send. |
| **Claude might invent content** | Prevented by SKILL.md rule | SKILL.md contains: *"You may only reference issues/PRs/commits that appear in the raw gh output. Every title, number, repo name, and link must trace back to the raw data. If a field is missing, omit the bullet. Do not invent anything — an empty section is always preferable to a fabricated one."* |
| **`send_mail.py` fails** (Mail.app not running, permission denied) | subprocess exit code ≠ 0 | Print stderr verbatim + `❌ Send failed. Draft preserved — you can try again.` Draft stays in conversation context so user can retry. |
| **Unparseable approval input** | Claude's own judgment | Reprint the "not sure" message. Never auto-select an option. |

**Not handled (YAGNI):**

- Retry with backoff — manual re-invoke instead
- Result caching — every run is fresh
- Partial success — if one of the three gh queries fails, the whole run stops. No half-drafts.

## `send_mail.py` Interface

```
scripts/send_mail.py \
  --to      <recipient email> \
  --from    <sender email> \
  --subject <subject line> \
  --body-file <path to markdown file> \
  [--dry-run]
```

- `--body-file` takes a file path, not stdin or `--body` — multi-line markdown on argv gets chewed up by shell interpretation. Claude writes the draft to a temp file, passes the path.
- `--dry-run` prints the osascript it would have executed and exits 0 without sending. Used during pre-demo verification.
- On success: prints `OK <timestamp>` and exits 0.
- On failure: prints error to stderr and exits 1.

## Pre-demo Verification Plan

Run this checklist tonight (2026-04-08) before the 2026-04-09 founder meeting:

1. **Skeleton in place** — all four files exist at the correct paths.
2. **Skill is discoverable** — in a fresh Claude Code session, `/weekly-report` invokes the skill, and separately "generate my weekly report" natural-language phrasing also triggers it.
3. **`gh auth status`** — verified manually, returns authenticated.
4. **Dry-run pipeline** — invoke the skill, walk through to Step 7. At the approval gate, tell Claude "use dry-run". Claude calls `send_mail.py --dry-run`. Verify: the printed osascript is well-formed, quotes escape correctly, subject and body render correctly.
5. **Real send** — one real run, send to `ryanlinjui@gmail.com`, confirm the email arrives with correct subject, body, sender.

Empty-data edge case verification is **dropped** from the pre-demo list because the real window will have real activity. It can be covered in the next-week real-e2e version.

## Open Questions (deferred to next-week real e2e)

These are out of scope for this MVP but recorded so they aren't lost:

- Browser automation stack — N/A for Option A (all sources have APIs)
- Inbound mechanism — polling vs webhook for Email/LINE auto-reply
- LINE session persistence across restarts
- Credentials storage model — where LINE / Gmail tokens live, secret management
- Scheduling — cron / Claude Code scheduled / manual (MVP is manual; next-week picks)
- Slack scope — which channels count as "producer messages"
- Notion scope — which databases / pages count as "meeting notes"
- Skill decomposition — whether to split into sub-skills as sources grow
- Inbound failure modes — question detection, reply loops, sender filter

## References

- [PRO-227 Notion task](https://www.notion.so/33c0b700541e81c1a278cccd8f385077) — source of truth for PoC framing
- [4/7 Scrum Meeting §12-15](https://www.notion.so/3330b700541e814c8f49effe470b083f) — Agent Skills as backend decision
- [Agent-as-Backend Research Brief (2026-04-07)](https://www.notion.so/33c0b700541e81eeaff3dc2d48502fe9) — A/B/C architecture analysis (context only; this MVP uses the agentskills.io runtime, not the SDK + MCP server runtime discussed there)
- [agentskills.io specification](https://agentskills.io/specification) — SKILL.md format
- [Claude Code skills documentation](https://docs.claude.com/en/docs/claude-code/skills) — runtime that loads SKILL.md files
