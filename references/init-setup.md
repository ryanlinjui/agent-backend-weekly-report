# Init & Health Check

Orchestrates initialization of all services. Each service has its own init file with detailed steps.

## Principle

- **If ANY service is ❌, STOP and fix it immediately. Do NOT skip.**
- **Auto-install what you can. Only ask user when physically required (login, SMS).**
- **Login pages = hands off (user types). Post-login = skill drives.**
- **Loop: check → fix → re-check until ALL ✅.**

## Health check

Check all services. Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Service health check
  GitHub:   ✅ / ❌
  Email:    ✅ / ❌
  Slack:    ✅ / ❌
  Notion:   ✅ / ❌
  LINE:     ✅ / ❌
  LinkedIn: ✅ / ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Init order

Fix services in this order (dependencies first):

1. **GitHub** → [references/init-github.md](init-github.md) — `gh auth login --web`
2. **Email** → [references/init-email.md](init-email.md) — Playwright → App Password
3. **Slack** → [references/init-slack.md](init-slack.md) — `/mcp` connect plugin
4. **Notion** → [references/init-notion.md](init-notion.md) — `/mcp` connect plugin
5. **LINE** → [references/init-line.md](init-line.md) — LINE Bot MCP + cloudflared webhook
6. **LinkedIn** → [references/init-linkedin.md](init-linkedin.md) — LinkedIn MCP + login

## After all ✅

Create `.env` if it doesn't exist with all collected values:
```
GITHUB_USERNAME=...
REPORT_RECIPIENTS=...
REPORT_WINDOW_DAYS=7
EMAIL_USER=...
EMAIL_PASSWORD=...
LINE_CHANNEL_ACCESS_TOKEN=...
LINKEDIN_RECIPIENTS=...
```

Re-run health check to confirm. Then return to SKILL.md pipeline.

## Browser MCP selection

| Situation | Use |
|---|---|
| Google login pages | Playwright (Google blocks Chrome DevTools) |
| Other login pages | Playwright (headed, visible) |
| Post-login automation | Chrome DevTools first → Playwright headless fallback |
| No browser needed | Native MCP / CLI |

## User interaction (entire init)

User only does:
1. Login — type password + 2FA in browser windows (each service, once)
2. `/mcp` connect — Slack + Notion plugins (once)
3. Provide info — email address, LinkedIn recipients (once)

Everything else is automated.
