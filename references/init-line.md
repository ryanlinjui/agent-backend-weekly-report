# Init: LINE

**Use Playwright MCP only.** Do NOT use "Claude in Chrome", `open` bash, or search MCP registry.

**NEVER ask the user to provide the Channel Access Token. The agent must obtain it via browser automation from LINE Developers.**

Init has two modes. Ask the user up front which one:

- **A. Create new OA** — run the full flow below (phases 1–5).
- **B. Reuse existing OA** — ask user to pick one from the OA list on `manager.line.biz`, save its `@accountId`, then **skip to phase 4** (Response settings) and **phase 5** (Token) via `scripts/line-init.js`.

## Phase 0 — LINE Business ID login

LINE Business ID often **auto-completes SSO silently** when any LINE cookie is still present in the shared `--user-data-dir` (e.g. the user logged in to a different LINE property earlier, or the skill completed Phase 5 on a prior run). Always try the silent path first — visible browser and `AskUserQuestion` only come out when SSO can't resolve on its own.

1. **`browser_close` any active `playwright-headless` session first** (Rule 6 — shared `--user-data-dir` means simultaneous visible + headless clobbers the Chromium lockfile).

2. **Try silent SSO in headless.** `playwright-headless` `browser_navigate` to `https://manager.line.biz`:
   a. If the URL settles on `manager.line.biz/` or `manager.line.biz/account/...` → already logged in. Close headless and proceed to Phase 1.
   b. If redirected to `account.line.biz/login` → click the `LINE account` button (the LINE-cookie SSO shortcut — same trick `scripts/line-init.js` Phase D and `scripts/line-qa-check.js` use). Wait up to 5 seconds.
      - If the URL now settles on `manager.line.biz` → silent SSO worked. Close headless and proceed.
      - If the login page stays (LINE wants QR / password) → fall through to step 3.

3. **Manual login fallback** (only when step 2 didn't resolve):
   a. `browser_close` the headless session.
   b. Switch to `playwright-login` and `browser_navigate` to `https://manager.line.biz` (visible).
   c. Tell the user they need to sign in to LINE Business ID (this single login also authorizes `developers.line.biz` via SSO — see Phase 5). Block on `AskUserQuestion` with `options: ["Done, I'm logged in", "Cancel"]`. Do NOT poll the page — the user may need to enter 2-step verification codes, wait on email verification, etc. Resume only on `Done`.
   d. Snapshot the page to confirm we're on the OA Manager dashboard (not still on a login / 2FA screen). Then `browser_close` the visible browser.

4. Proceed with `playwright-headless` for the remaining phases — unless Phase 1's entry form hits a reCAPTCHA challenge, in which case close headless first and run the form fill visibly so the user can solve it.

## Phase 1 — Create new OA (mode A only)

Navigate to `https://entry.line.biz/form/entry/unverified` and fill the form via `scripts/line-create-oa-fill.js`:

| Field | Script placeholder | Stable selector |
|---|---|---|
| 帳號名稱 (≤ 20 chars) | `__ACCOUNT_NAME__` | `input[name="bot.name"]` |
| 電子郵件帳號 | `__EMAIL__` | `input[name="account.email"]` |
| 公司所在國家或地區 | `__COUNTRY__` | `select[name="legalCountryCode"]` |
| 公司名稱 (≤ 100 chars) | `__COMPANY_NAME__` | `input[name="account.name"]` |
| 業種大類 | `__INDUSTRY_MAIN__` | `select[name="category_group"]` |
| 業種小類 | `__INDUSTRY_SUB__` (null = first valid) | `select[name="category"]` |

The script fills fields and returns. **Submit is not scripted** — reCAPTCHA v3 runs invisibly on this form and can challenge unpredictably. Click `button[type="submit"]` after the template returns; if URL progresses to `/confirmation`, click the `完成` button on the review page to land on `/complete`. The new OA's `@accountId` is in the returned URL: `https://manager.line.biz/account/@<id>`.

## Phase 2 — Agree to post-creation TOS (mode A)

First-time login to a fresh OA lands on a sequence of `/notices/...` pages — "同意我們使用您的資訊", "LINE官方帳號使用條款更新啟事", etc. Phase A of `scripts/line-init.js` loops and clicks the agreement button regardless of label (`同意` / `了解並繼續使用` / `I understand...` / `Agree`) until the URL stops matching `/notices/`.

## Phase 3 — Enable Messaging API

Phase B of `scripts/line-init.js`. On `/account/<id>/setting/messaging-api`:

1. Skip if `Status` is already `Enabled` (idempotent).
2. Click `Enable Messaging API`.
3. Provider modal: pick existing (`providerName` arg — clicks `label.custom-control-label:has-text("<name>")`) or create new (`newProviderName` fills `input[placeholder="Enter provider name"]`).
4. Agree to Messaging API TOS.
5. Privacy Policy + Terms of Use modal — leave both empty and click `OK`.
6. Final confirmation modal — click `OK`.

After enable, the page shows Channel ID + Channel secret, which the script extracts by text pattern (`Channel ID\s+(\d+)` / `Channel secret\s+([a-f0-9]+)`).

## Phase 4 — Response settings

Phase C of `scripts/line-init.js`. On `/account/<id>/setting/response`, toggle via label click (the styled switch intercepts direct input clicks):

| `name` | Target | Rationale |
|---|---|---|
| `chatMode` | **ON** | Required so QA monitoring can read/reply via the web chat UI. |
| `welcomeMessage` | **OFF** | No greeting message on follow. |
| `autoResponse` | **OFF** | Auto-reply off. (May be hidden once `chatMode` is on — they're mutually exclusive. No-op toggle is acceptable.) |

LINE OA saves toggles automatically — no explicit save button.

## Phase 5 — Channel Access Token

Phase D of `scripts/line-init.js`. Navigate to `https://developers.line.biz/console/channel/<channelId>/messaging-api`:

- `developers.line.biz` runs a session **separate from** `manager.line.biz`. Even when LINE Business ID is authenticated, the Developers console may redirect to `account.line.biz/login` on first visit. The script detects this and clicks the `LINE account` button, which triggers an SSO handshake against the existing Business ID cookies — no password re-entry required.
- If an `Issue` button is present → first-time issuance → click it; token appears immediately below the "Channel access token (long-lived)" heading.
- If only a `Reissue` button is present → token already exists → **do NOT click** (reissuing invalidates the old token and breaks any existing integrations). Just read the displayed value.

The script extracts the token with `([A-Za-z0-9+/=]{100,})` from the slice after `Channel access token (long-lived)` — the only long base64-like run in that area.

Save to `config.json`:

```json
{
  "line_account_id": "@<id>",
  "line_account_name": "<name>",
  "line_channel_id": "<numeric>",
  "line_channel_secret": "<hex>",
  "line_channel_access_token": "<long-lived token>"
}
```

`config.json` is in `.gitignore` — secrets stay local.

## Session persists

Subsequent runs reuse the Playwright session for QA chat monitoring via `https://chat.line.biz/account/<id>` (see Step 5). Sessions typically last weeks.

## Re-running

`scripts/line-init.js` is idempotent:

- Skips Phase 3 setup if Messaging API already enabled.
- Toggles in Phase 4 are no-ops when already at target state.
- Phase 5 reads the existing token rather than reissuing.

So running on an existing OA just re-verifies configuration and refreshes the saved token value.
