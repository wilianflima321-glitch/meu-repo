# Critical User Experience Audit — 26 Points

**Status:** Code-validated synthesis (Cursor, 2026-06-17)  
**Billing mitigations:** [`billing_security_analysis.md`](./billing_security_analysis.md) §9–§11  
**Wave mapping:** [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md)  
**Iteration close:** [`walkthrough.md`](./walkthrough.md)

---

## A. Billing & platform integrity (#1–#5)

| # | Issue | Validation | Mitigation | ID |
|---|-------|------------|------------|-----|
| 1 | UsageBucket row lock on every AI settle | **PLAUSIBLE** — `metering.ts` txn updates same month row | Redis counter + 30s batch flush to Postgres | `DEBT-FIN-011` |
| 2 | Transfer deadlock A↔B | **PLAUSIBLE** — no lock ordering in `credits/transfer/route.ts` | Lock users by **sorted UUID** | `DEBT-FIN-012` |
| 3 | Stripe webhook delay = free Pro | **CONFIRMED** — webhook doesn't set `plan: free` | Lazy Stripe reconcile in auth middleware (1h cache) | `DEBT-FIN-013` |
| 4 | Hourly request caps break flow | **CONFIRMED** — Starter 30/hr in `plan-limits.ts` | Token bucket burst; monthly cap only | `IMPROVE-BILLING-005` |
| 5 | Economics policy gaps (BYOK tax, collab seats on Git, 256MB MP OOM) | Policy | Modular $5 BYOK; Yjs seats only; local tunnel default | `IMPROVE-BILLING-003`, `IMPROVE-COLLAB-004`, `IMPROVE-PLATFORM-008` |

---

## B. Trust & honesty (#6–#7)

| # | Issue | Validation | Mitigation | ID |
|---|-------|------------|------------|-----|
| 6 | Export USDZ/WAV mock after pay | **CONFIRMED** — export stubs | `[BETA]` / `[HELD]` badges; strip from Stripe features until real | `IMPROVE-UX-007` |
| 7 | Stripe pricing lists unbuilt features | Policy | Feature manifest gate vs `plans.ts` | `IMPROVE-BILLING-006` |

---

## C. Performance & IDE (#8–#17)

| # | Issue | Validation | Mitigation | ID |
|---|-------|------------|------------|-----|
| 8 | WebGL loop while editing Monaco | **CONFIRMED** — no pause on editor focus | Pause `useFrame` when viewport hidden | `IMPROVE-ENG-023` |
| 9 | Git branch vs Yjs overwrite | **CONFIRMED** — `legacy-collaboration-handler.ts` | Collab channel = branch hash; presence cursors | `DEBT-YJS-001`, `IMPROVE-COLLAB-005` |
| 10 | Silent save fail on WS drop | **PARTIAL** | IndexedDB emergency buffer + sync LED | `IMPROVE-UX-008` |
| 11 | VS port magnetism / quick search | **DONE (2026-07-11ae)** — `connectionRadius={20}` on VisualScriptEditor | 20px snap + fuzzy wire on drop | `IMPROVE-VS-012` |
| 12 | Console logs lost from playtest iframe | **DONE postMessage / HELD desktop IPC (2026-07-11ae)** — `playtest-console-bridge.ts` + ConsoleIntegration listener | postMessage / IPC bridge | `IMPROVE-IDE-018` |
| 13 | Console 100 log cap | **DONE (2026-07-11ae)** — 5k capped + `@tanstack/react-virtual` | Virtualize 5k logs | `IMPROVE-IDE-019` |
| 14 | GLTF flatten destroys rig | **CONFIRMED** — `loaders.ts` | Preserve hierarchy | `DEBT-ASSET-001` |
| 15 | Film audio in 260px inspector | **CONFIRMED** — `FilmStudioClient` | Slot swap per `IMPROVE-FILM-001` | `IMPROVE-FILM-001` |
| 16 | Marketplace install → /login | **FIXED (2026-06-19)** — `marketplace/page.tsx` now POSTs to real `/api/marketplace/install`; 401→login, 200→installed, 404→honest "curated preview" notice, 403→plan notice; dead "Configure" button removed | In-page POST install | `DEBT-PLUGIN-001` |
| 17 | Dashboard banner stack (not Linear-minimal) | **DONE (2026-07-11ae)** — `DashboardIntentRail` single row | Collapse to single intent row | `DEBT-UX-DASH-001` |

---

## D. AI & MCP architecture (#18–#20)

| # | Issue | Validation | Mitigation | ID |
|---|-------|------------|------------|-----|
| 18 | MCP stdio in web browser | **CONFIRMED** — `mcp/servers/route.ts` default `stdio` | Web: SSE/WS only; Desktop: stdio via Tauri | `DEBT-DB-001`, `IMPROVE-PLATFORM-009` |
| 19 | Deep context substring search | **CONFIRMED** — `scoreChunk` `haystack.includes(term)` ~119–124 | Vector RAG / embeddings | `DEBT-SEARCH-002`, `IMPROVE-AI-002` |
| 20 | No workspace auto-index | **CONFIRMED** — cartography static | Workspace crawler worker | `IMPROVE-AI-002`, `IMPROVE-DESK-003` |

---

## E. Product coherence (#21–#23)

| # | Issue | Validation | Evidence | Mitigation | ID |
|---|-------|------------|----------|------------|-----|
| 21 | **AI-tunneling UX** — dashboard forces chat, not workspace | **DONE (2026-07-11ae)** | Resume → IDE `entry=resume` + session/dock restore | Remaining polish: multi-tab bulk open | `IMPROVE-UX-009` |
| 22 | **Dual desktop runtimes** — Electron + Tauri | **CONFIRMED** | `runtime-templates/` (windows/macos/linux Electron); canonical = `apps/studio-local/` Tauri 2 | Deprecate and remove Electron templates; single Tauri 2 release channel | `DEBT-DESK-007` |
| 23 | **Orphan admin routes → 404** | **DONE (2026-07-11ae)** — 12 thin `page.tsx` redirects via `ADMIN_LEGACY_ROUTE_REDIRECTS` | Missing pages: closed | Delete orphan dirs or add thin `page.tsx` re-exports; consolidate nav in Admin Command Center tabs | `DEBT-ADMIN-002` |

---

## F. Ops resilience & production UX (#24–#26)

| # | Issue | Validation | Evidence | Mitigation | ID |
|---|-------|------------|----------|------------|-----|
| 24 | **CSP blocks loopback in prod** — hybrid dev / local MCP broken | **DONE (verified 2026-06-19)** | `middleware.ts` L43: `connect-src` now always allows `ws://localhost:* http://localhost:* ws://127.0.0.1:* http://127.0.0.1:* ws://[::1]:* http://[::1]:*` (not gated by `isDev`) | — | `DEBT-CSP-001` |
| 25 | **Fail-closed rate limit** — Upstash outage = full IDE 503 | **DONE (verified 2026-06-19)** | `middleware.ts` L322–346: Redis missing/failed → **fail-open** (`console.warn` + request proceeds), never global 503 | Remaining (optional): keep auth/billing fail-closed for stricter posture | `DEBT-OPS-001` |
| 26 | **RenderJob errors swallowed** — compile appears stuck | **CONFIRMED** | `app/api/render/jobs/[jobId]/route.ts` ~43 `.catch(() => null)` → generic 503 `schemaPending` | Startup schema compatibility check; surface pending migrations in server console, not silent 503 | `DEBT-RENDER-001` |

---

## G. Execution priority (post-audit)

| Wave | Focus | Points |
|------|-------|--------|
| **6** | Billing + schema spine | #1–#3, #26 (`RenderJob` in Prisma) |
| **7** | Studio UX + ops | #8, #10, #15, #17, #21–#25 |
| **1** | AI spine | #18–#20 |
| **9** | Desktop native | #22, terminal (`DEBT-TERM-001`) |

---

## H. Additional IDE polish (tracked, not in top-26)

Still in `FUTURE_IMPROVEMENTS_REGISTRY.md`: static keyboard shortcuts (`IMPROVE-IDE-020`), settings JSON split (`IMPROVE-IDE-021`), layout hotkeys Ctrl+B/J (`IMPROVE-IDE-022`).

---

## I. End-to-end visual quality pass (2026-06-19)

Full visual triage of every user-facing surface lives in **`visual_quality_triage.md`** (P0/P1/P2 with file:line + token fixes). Shipped this round (pixel-neutral a11y + clear defects):

- **Landing empty eyebrow** rendered (`landing-v3.tsx` — was a bare comment).
- **Mobile nav clearance** (`.has-mobile-nav` CSS) so last rows aren't hidden behind the fixed bottom nav.
- **Focus rings** (`CANONICAL_FOCUS`) on PublicHeader nav/CTAs, SettingsCommandCenter, Marketplace card + install modal.
- **Install modal** backdrop/shadow/radius moved onto tokens (theme-aware).

Remaining P0 (radius/shadow/color token unification) is **pixel-change** → batched per surface with visual-regression snapshot regeneration; see the triage doc.

---

## J. Catálogo Vivo + Arcade (2026-06-19)

Two end-to-end surfaces brought from fragmented/absent to coherent and honest:

- **Catálogo Vivo (Marketplace).** `DEBT-MKT-FRAG-001` resolved. One canonical catalog (`lib/marketplace/catalog.ts`, built-ins + curated, slug-keyed). `GET /api/marketplace/catalog` serves it with the caller's real install state merged from Prisma. The public page now consumes the live catalog; curated installs **persist** (slug accepted by `/install`, no more guaranteed 404); **uninstall** is wired to the real API with optimistic rollback; entitlement gate handles **402** as well as 403.
- **Arcade (`/arcade`).** New `PublishedGame` model; `POST/GET/DELETE /api/projects/[id]/publish` (owner-only, tied to the real web `ExportJob`); `GET /api/arcade` (list) + `GET/POST /api/arcade/[slug]` (detail + play counter). Public list/detail UI with **honest play states** — playable games run in a sandboxed iframe; published-without-build show a clear "Build pending — not yet playable" state (Honesty Gate). Creator publish panel (real project ids) + primary nav link + BETA maturity entry.
- **Ops note:** requires `npx prisma migrate deploy` to create the `PublishedGame` table before runtime; the arcade list/detail degrade to an honest empty state until then.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Consolidated 20+ user critiques with code validation |
| 2026-06-17 | **v2** — full **26-point** map; sections E (product coherence) + F (ops resilience); code re-validated |
| 2026-06-19 | **v3** — end-to-end visual triage (`visual_quality_triage.md`); shipped pixel-neutral a11y + defect fixes (#17 partial: mobile nav clearance, landing eyebrow) |
| 2026-06-19 | **v4** — §J Catálogo Vivo (`DEBT-MKT-FRAG-001` resolved) + Arcade surface end-to-end (model, publish/list/detail APIs, public UI, creator panel, nav) |
