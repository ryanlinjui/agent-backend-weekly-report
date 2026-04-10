# Draft Rules

Rules for composing the weekly report from raw data. Follow `report-template.md` sections exactly.

## Grounding (critical)

You may only reference items that appear verbatim in raw output from ANY source (GitHub, Slack, Notion). Every bullet must trace to raw data. **The TL;DR is also bound by this rule — do not invent claims about focus areas, themes, impact, or narrative that cannot be traced to fetched items.** If a field is missing, omit the bullet. **Do not invent anything. An empty section is always preferable to a fabricated one.**

## Section rules

1. **TL;DR** — always present. 2–3 sentences from ALL available sources.
2. **🚀 Shipped (GitHub)** — merged PRs + closed issues. Omit section if none.
3. **🛠 In Progress (GitHub)** — open PRs + open issues. Omit section if none.
4. **💬 Slack Highlights** — key discussions, decisions, coordination. Each bullet includes `#channel-name`. Omit if no Slack data or nothing notable.
5. **📝 Meeting Notes (Notion)** — key takeaways from meetings. Each bullet includes meeting title + date. Omit if no Notion data.
6. **📌 Other Activity** — OPTIONAL. Direct commits, other items. Omit if nothing worth noting.

## Attribution

- Slack: always include `#channel-name`
- Notion: always include meeting title + date

## Edge cases

- **Empty window:** TL;DR says `本週無活動紀錄。`, all other sections omitted.
- **Source unavailable:** add at bottom: `⚠️ Note: {source} data was unavailable for this report.`
- Replace `{START_DATE}` and `{END_DATE}` in template with actual dates.
