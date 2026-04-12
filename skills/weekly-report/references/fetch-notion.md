# Fetch Notion Meeting Notes

Read meeting notes the producer attended or contributed to in the report window.

## Prerequisites
- Notion MCP must be connected in Claude Code (the `mcp__plugin_Notion_notion__*` tools must be available)
- No API token needed — the MCP handles authentication

## Steps

### 1. Search for meeting notes in the window

Use `mcp__plugin_Notion_notion__notion-search` with a query like "meeting" or "scrum" to find recent meeting note pages.

### 2. Filter by date

From the search results, filter pages where the date property falls within `W_start` to `W_end`. Meeting notes typically have a `Date` property — check the page properties.

### 3. Fetch each relevant page

For each meeting note in the window, use `mcp__plugin_Notion_notion__notion-fetch` with the page URL or ID to get the full content.

### 4. Extract key information

From each meeting note, extract:
- Meeting title and date
- Attendees (confirm the producer was there)
- Action items assigned to the producer
- Key decisions or discussion points the producer contributed to

Keep the raw extracted content. Do NOT summarize yet — that happens at the draft step.

## Fallback

If Notion MCP is not connected (tools not available), print a warning and skip Notion source. Do not fail the entire pipeline. The report will note that Notion data was unavailable.
