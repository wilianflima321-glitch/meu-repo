# User Experience Criticism — End-User Perspective

**Status:** Validated against codebase (Cursor, 2026-06-17)  
**Canonical improvements:** [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md)  
**Extended audit:** [`critical_user_experience_audit.md`](./critical_user_experience_audit.md)

---

## 1. Local-first vs cloud project limits

**Critique:** Limiting FREE to 1 **local** Tauri project drives churn. Local disk costs $0.

**Validation:** `plans.ts` `limits.projects: 1` applies to cloud entitlement — not distinguished from local in code today.

**Redesign (v3 — adopted in spec):**

| Limit | Free | Starter | Pro | Studio |
|-------|------|---------|-----|--------|
| **Local projects (Tauri)** | ∞ | ∞ | ∞ | ∞ |
| **Cloud-synced projects** | 1 | 3 | ∞ | ∞ |
| **Active CDN deploys** | 0 | 1 | 5 | 20 |

**IDs:** `IMPROVE-UX-005`, `DEBT-FIN-010` (plan semantics)

---

## 2. Workspace profiles (Code / Research / Game)

**Critique:** 3D viewport wastes GPU when user only writes TypeScript or runs agent research.

**Redesign:**

- **Code Mode** — hide viewport; pause R3F loop; Monaco + terminal + chat full width
- **Research Mode** — agent runs, MCP servers, prompt logs
- **Game Mode** — classic viewport + outliner + inspector

**IDs:** `IMPROVE-STUDIO-012`, `IMPROVE-ENG-023` (render pause when tab inactive)

**Evidence:** No profile switcher in `CreativeWorkbenchShell`; WebGL runs on route change.

---

## 3. BYOK on all tiers

**Critique:** Blocking BYOK on Free/Starter forces subscription for users who pay OpenRouter directly.

**Redesign (v3 — adopted):**

- **BYOK enabled on all tiers** (including Free) — platform AI cost = $0
- Paid tiers sell **cloud value**: storage, CDN deploy, realtime collab seats, dedicated MP tunnel
- **Modular add-on:** BYOK convenience pack **$5/mo** (webhooks, priority queue) — not $15 gate on Pro

**IDs:** `DEBT-BILLING-001`, `IMPROVE-BILLING-003`

---

## 4. Token weight transparency (UX Shield)

**Critique:** Weighted tokens (40× Sonnet) invisible until hard block.

**Redesign:** Pre-send estimate in `InlineComposerWidget.tsx` — "≈ 40,000 plan tokens (Sonnet 40×)".

**IDs:** `IMPROVE-UX-006`, `IMPROVE-BILLING-001`

---

## 5. Desktop offline grace period

**Critique:** Tauri users expect 14-day offline license grace; cloud quota check must not brick local editor.

**Redesign:** Desktop validates license in background; local edit + local AI (BYOK/onnx) without network; cloud sync queued.

**IDs:** `IMPROVE-DESK-005`, `IMPROVE-BILLING-004`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Initial ingest; local/BYOK/profile/offline redesigns |
