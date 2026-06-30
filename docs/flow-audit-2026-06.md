# PrayerBands — Core Flow Security & UX Audit (2026-06)

Audit of the four adoption-critical flows: **registration / first-tap**, **transfer / gifting / dedication**, **prayer circles**, and **prayer network (tap-to-add-friend)**. Findings below; ✅ = personally verified against the code, ◻ = reported by audit, consistent with verified patterns but not individually re-read.

## Systemic root cause (read this first)

Most Critical findings share **one root cause**: API routes use the **service-role client** (which bypasses Row-Level Security) while **(a) never calling `auth.getUser()`** and **(b) trusting a user id / band id supplied in the request body or query string**. The service key is the right tool *only after* the server has authenticated the caller and authorized the specific action. Today many routes skip both steps, so RLS — the safety net we hardened in the last pass — is simply not in the path.

Fixing the pattern (derive the actor from the session, authorize the action server-side, then use service role) closes the majority of the Highs at once.

---

## CRITICAL

### C1 — `register-band` is open: anyone can append a "holder" to any band, and registrations never bind a user ✅
`app/api/register-band/route.ts:12-94`. No auth, no rate limit, no band-status gate, no `user_id` stored on the registration (the client even sends `userId` — it's ignored). Consequences:
- A signed-in owner who registers their own band creates a row with `user_id = null`, so on the next tap they're shown the *public* journey, not their personal space. Server-side recovery is impossible; "ownership" survives only in `localStorage`.
- Anyone can `POST /api/register-band` for any `bandId` to append arbitrary holders/prayers and flip status to `registered` (no `UNIQUE(band_id)` either).
**Fix:** authenticate; store `user_id` from the session; rate-limit; reject unless band is `unregistered`/`pending_transfer`.

### C2 — `initiate-transfer` is unauthenticated and trusts `userId` ✅
`app/api/initiate-transfer/route.ts:10-29`. Takes `{ bandId, userId, note }`, never authenticates, never checks the caller owns the band.
- `from_user_id` is spoofable → the "X is passing you this band" sender shown to the recipient can be forged.
- Any anonymous caller can flip **any** band into `pending_transfer` → griefing/DoS of strangers' bands.
**Fix:** require session; derive `from_user_id` from it; verify caller holds the band; reject if not `registered`.

### C3 — Prayer-circle join codes are public read-keys, with no rate limiting ✅
- `app/api/circles/lookup/route.ts` — unauthenticated, unthrottled, service-role; returns `join_code`, `created_by`, `description` for any code. 6-char code over a 31-char alphabet, enumerable with no lockout.
- `app/api/circles/[circleId]/route.ts:50-58` — grants full **member list + every prayer request** to anyone presenting a valid code; membership is *not* required. The code is handed out freely (above + the public `/circle/[id]` page), so "private, invite-only" collapses to "anyone with the link/UUID, or a scraper."
**Fix:** rate-limit `lookup` and the GET (reuse `lib/rate-limit.ts`); stop returning `join_code`/`created_by`; treat the code as a one-time *join* secret, not a *read* credential; don't return request text to non-members.

### C4 — Cross-circle IDOR on intercede ✅
`app/api/circles/[circleId]/intercede/route.ts:27-59`. Verifies membership in `circleId` but never checks that `request_id` belongs to that circle. A member of circle A can toggle intercessions on requests in circles they can't access (service-role insert bypasses the RLS `WITH CHECK`). Also an existence oracle for request UUIDs.
**Fix:** load the request, assert `request.circle_id === circleId` before insert/delete.

### C5 — `/api/prayer-network` IDOR: dump anyone's network (names + emails) ✅
`app/api/prayer-network/route.ts:4-11`. Reads `uid` from the query with the service client, no `auth.getUser()`. `GET /api/prayer-network?uid=<any-uuid>` returns that user's whole network including **friends' email addresses**. User ids are not secret (they appear in other payloads). Still wired into the live dashboard.
**Fix:** derive the user from the session; ignore `uid`; never return raw emails.

### C6 — `mark-dedication-viewed` is unauthenticated → a stranger can burn the one-time blessing ◻
`app/api/mark-dedication-viewed/route.ts:6-27`. `{ bandId }` → `update bands set dedication_viewed = true`, service key, no token, no auth. The blessing screen only shows while `!dedication_viewed`, and nothing ever resets it. A bot, link-preview crawler, or anyone who guesses a `bandId` permanently suppresses the recipient's "sent especially for you" reveal — the emotional peak of gifting.
**Fix:** gate behind the per-band `dedication_token`, or only set it as part of the recipient's authenticated first registration.

### C7 — Private blessing is readable without the token ◻
`app/api/band-status/route.ts:113-124` returns `dedication_note` / `dedication_recipient` from the **public** status endpoint for un-tapped gift bands (and they're in the anon column grant). The dedication token gates *writing* the note, not *reading* it, so the token's confidentiality protection is largely illusory; a band-id sweep reads strangers' private blessings.
**Fix:** don't return the note from the public endpoint without proof the caller is the recipient (token in the recipient's link, or reveal only after registration).

### C8 — Org invite can reset an existing account's password (takeover via forwarded link) ✅
`app/api/accept-invite/route.ts:61-73`. If an account already exists on the invited email, the route calls `updateUserById(userId, { password, email_confirm: true })` — overwriting that user's password — with the only proof being possession of the invite **token**. Token is strong (not guessable), so the realistic vector is a forwarded/leaked invite link; whoever opens it takes over the existing account and folds it into the org.
**Fix:** if an account exists on the email, require the invitee to **sign in** (proving they own it) and then attach `org_id`; only set a password for genuinely new accounts.

---

## HIGH

### H1 — Transfer accept/cancel run client-side as anon and are blocked by post-hardening RLS ◻
`app/band/[bandId]/page.tsx:296-328`. The browser anon client does `update band_transfers ...` and `update bands set status ...`. After the June hardening, `bands` has only a **site-admin** UPDATE policy, so a normal recipient's `bands` update silently no-ops (0 rows, no error checked). The handoff "works" only because `register-band` independently flips status with the service key; the `band_transfers` row is likely left `pending` forever, and the old owner's "waiting for them to tap" poll can hang. Not atomic.
**Fix:** move accept/cancel into a server route (service client + authorization), complete registration + transfer + status in one place, check row counts.

### H2 — `request-prayer` has no rate limit; email blaster from `bands@prayerbands.com` ◻
`app/api/request-prayer/route.ts`. Sender is correctly taken from the session (good), but no throttle and no recipient cap — each call emails the *entire* derived network. A mass-registered band → a large list → free spam relay. `prayerText` is also injected unescaped (see H5).
**Fix:** rate-limit per user; cap recipients; server-side opt-out list + `List-Unsubscribe`.

### H3 — Legacy network is auto-derived from registrations with **zero consent** ◻
`app/api/prayer-network/route.ts`, `lib/network.ts`, `app/api/request-prayer/route.ts`. "Your network" = anyone who registered your band (or vice-versa), computed live with no accept step, no block, no removal. Anyone who taps/registers your band is silently added and becomes a prayer-request target (and their email is exposed via C5). The newer `prayer_network_connections` request→accept flow is the correct model and is well-built — the legacy email-network should be retired onto it.

### H4 — `pray-ack` replay / spam + attacker-controlled name ◻
`app/api/pray-ack/route.ts`. Ack link carries `id`, `name`, `email` in plain URL with no token/HMAC. It does verify the email is a listed target (good), but `name` is attacker-chosen and emailed verbatim to the requester, and there's **no dedupe/replay guard** — each hit inserts a row and re-emails the requester. Forwarded link or prefetch bot = spam loop.
**Fix:** per-(prayer,recipient) opaque token, marked consumed on first ack; bind name to the token; escape values.

### H5 — `claim-band` ownership is decoupled from holding ◻
`app/api/claim-band/route.ts:42-60`. Any signed-in user can set `owner_id` on any band whose `owner_id` is null. Since registrations never set `owner_id` (C1), accountless first-tap bands stay null forever, so a stranger who learns a `bandId` can claim ownership of a band someone else physically holds. Rate-limited (5/min) but the authorization gap remains.
**Fix:** only allow claiming by the current holder (matching `registrations.user_id`) or a verified purchaser.

### H6 — HTML injection into every transactional email ✅ (register-band path) / ◻ (others)
`register-band:117-137`, `request-prayer:104-112`, `pray-ack:51-69`, `send-journey-alert`, `send-band-passed-on`. User-controlled `name`, `prayer`, `location`, `acknowledgerName` are interpolated raw into email HTML — phishing-in-a-prayer-email (fake links/markup land in recipients' inboxes).
**Fix:** one `escapeHtml()` helper applied to every interpolated user value; cap field lengths.

---

## MEDIUM (selected)

- **M1** `save-dedications` array path writes dedications to any unowned band **without auth or token** (`save-dedications/route.ts:78-89`) — a stranger can overwrite a gift's blessing before it's tapped. ◻
- **M2** `network/request` check-then-insert race; `UNIQUE(requester,recipient)` is directional, so simultaneous A→B / B→A creates duplicate pairs, and `.maybeSingle()` then throws → broken UI. ◻
- **M3** `incoming_gift` marks the dedication viewed *before* the recipient commits, so closing the tab on the claim form loses the blessing permanently (`IncomingGiftScreen.tsx`, `band-status:116`). ◻
- **M4** `upline_user_id` lineage column is **never populated** on transfer — dead column; the visible chain is `registrations`-derived only. ◻
- **M5** `band-status` uses `.single()` for the band fetch → transient DB errors render the dead-end "Band not found" screen. ◻
- **M6** "Just view the journey" buttons (`page.tsx:898,920`) route into the claim form — no read-only path for someone who only wants to look. ◻
- **M7** `my-circles` vs `create` disagree on who is a "band holder" (`.single()` vs registration-aware) → inconsistent dashboard state. ◻
- **M8** `network/respond` decline hard-deletes with no block/cooldown → unlimited re-request harassment (no rate limit on `network/request`). ◻
- **M9** Two share-URL formats for circles (`/circle/[id]` vs `/circles?code=`) — ambiguous canonical entry point. ◻

## LOW (selected)

- Profanity filter (`lib/moderation.ts`) is trivially bypassed (spacing/leetspeak), English-only, soft-flag only.
- `r/[bandId]` redirect has no `<noscript>`/anchor fallback; `not_found` screen offers no "re-enter ID" CTA.
- Inline IP-geocode (`ipapi.co`/Nominatim) on every registration with no timeout → spinner can hang.
- `intercede` (both circle and network) allow toggling on already-answered requests.
- `invite-info` / `network/status` disclose invitee email / recipient name pre-connection (tokens are strong, so low).
- `my-notifications` hardcoded admin email + unrestricted `?viewAs=` impersonation.
- Status enum `active` is allowed by the CHECK but never produced/handled.

---

## What's actually solid (don't regress these)
- The **`prayer_network_connections` consent flow** (request → accept → intercede): `respond` verifies `conn.recipient_id === user.id`, self-connection blocked, RLS-backed. This is the model to migrate the legacy network onto.
- **Leader/destructive circle actions** (delete circle, remove member, mark answered) are correctly gated on `created_by`/author server-side — a regular member can't nuke a circle.
- **Invite tokens** and **dedication tokens** are cryptographically strong (not guessable). The issues are around *use* (reuse/replay/leak), not entropy.
- `request-prayer` correctly derives the sender from the session, not the body.

## Recommended fix order
1. **C1, C2, C5, C8** — auth/IDOR holes that leak PII, enable takeover, or let strangers write to others' bands. (Pattern fix: session-derive the actor, authorize, then service role.)
2. **C3, C4** — circle privacy: rate-limit + stop treating join code as a read key + validate `request_id` ownership.
3. **C6, C7, M1** — protect the dedication/blessing (read + the "viewed" flag + the unauthenticated overwrite).
4. **H1** — make transfer accept server-side and atomic (it's currently half-broken by RLS).
5. **H6** — `escapeHtml()` across all email templates (cheap, broad).
6. **H2/H3/H4** — retire the consent-less legacy network or gate it behind accepted connections; add rate limits + opt-out.
