# 🎯 Master Mission Briefing — Aethel Engine (Handoff → Claude Opus)

**Version:** 1.1 (2026-06-19)
**Role:** **Front door** for Claude Opus. This file holds the **why, the quality bar, and the execution phases**.
**Delegates the catalog to:** [`CLAUDE_MASTER_BRIEF.md`](./CLAUDE_MASTER_BRIEF.md) (full `DEBT-*`/`IMPROVE-*` index, wave bundles, source-file map).
**Mode:** Planning **closed**. Code changes start **only** on explicit **"Execute Wave N"**.
**North star:** Honest market leadership — **Cursor-class AI + Blender/UE workbench density + Itch-class publish loop + Tauri offline moat** — with **zero fake parity claims**.

> ⚠️ There must be exactly **one** front door. This file = mission + quality + phases. `CLAUDE_MASTER_BRIEF.md` = catalog + IDs + wave mechanics. If they ever disagree, **this file wins on intent**, `CLAUDE_MASTER_BRIEF.md` wins on IDs/paths.

---

## 0. 60-second start

1. Read **§1 (truth)** and **§4 (quality bar)** — non-negotiable.
2. Run **Wave 0 preflight** gates (§6).
3. Execute **one full Wave** from §5 — never cherry-pick lone `DEBT-*` tickets.
4. For every UI element: pass the **Honesty Gate** (§4.3) — no blind buttons over mocked backends.
5. Re-run gates before closing the session; update the registry changelog.

### ⚡ Supreme execution prompt

```
Execute Wave 6 from walkthrough.md + contracts_planning.md + implementation_plan.md + CLAUDE_MEGA_WAVES.md.
Re-run npm run qa:enterprise-gate before and after.
One full Wave per session — no micro-PRs.
```

---

## 1. Brutal truth (read before touching UI)

The backend core is hardened, but **large surfaces are placebos**. Do not build polished UI on top of a lie — wire the real pipeline or label it honestly.

| Claim we want | Truth in code today | Wave | Risk if shipped blind |
|---------------|---------------------|------|------------------------|
| Production billing | Webhook skips downgrade; no token weights; dual plan files | **6** | Opus bleed bankrupts platform |
| BYOK supported | Zero implementation | **6** | Trust/legal incident if keys logged |
| Cloud + local projects | Dashboard project list is in-memory mock | **7** | Users hit wrong limits |
| Marketplace install | `POST /api/plugins/install` → 503 | **8** | Broken trust |
| Export GLB/USDZ | Fake job IDs → 503 | **6** | Paid feature placebo |
| Real-time collab | Yjs handler never `applyUpdate` | **2** | Silent data loss |
| Terminal in IDE | PTY on **cloud server**, not user PC | **9** | Security + useless locally |
| Nanite / path trace / VT | Documented placebos | **3** | Credibility destruction |
| WASM visual-script compiler | Interpreted in JS, no real WASM transpile | **7/2** | "Atomic runtime" is fiction |
| Semantic search / RAG | `.includes()` hash bag, not embeddings | **1** | "AI understands your repo" is false |

**Rule:** UI may show `[BETA]` / `[HELD]` + manifest link until the Wave acceptance passes. Renaming a placebo (subsample LOD → "Nanite") is a **reject**.

---

## 2. Mandatory reading order (11 docs)

| # | File | Why |
|---|------|-----|
| 1 | [`walkthrough.md`](./walkthrough.md) | Start here — iteration close + Wave 6→9 order + spec-vs-code |
| 2 | [`contracts_planning.md`](./contracts_planning.md) | Formal contracts: billing, BYOK, cloud/local projects, Arcade, Marketplace, matrix §8 |
| 3 | [`implementation_plan.md`](./implementation_plan.md) | Wave 6 billing step-by-step + Human-in-the-loop + plan decisions §11 |
| 4 | [`billing_security_analysis.md`](./billing_security_analysis.md) | Economics $9/$29/$79, token weights, margins, Redis, fail-open §11, BYOK §12 |
| 5 | [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) | Executor — 9 mega-waves, DEBT+IMPROVE bundles |
| 6 | [`critical_user_experience_audit.md`](./critical_user_experience_audit.md) | 26 UX/ops critiques validated in code (#1–#26) |
| 7 | [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) | ~89 `DEBT-*` with evidence lines |
| 8 | [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md) | ~143 `IMPROVE-*` |
| 9 | [`analysis_results.md`](./analysis_results.md) | Engine placebo severity map |
| 10 | [`user_experience_criticism.md`](./user_experience_criticism.md) | UX redesign context (local, BYOK, profiles) |
| 11 | [`audit_backend_spine.md`](./audit_backend_spine.md) | Backend spine audit (API mocks, asset destruction, fake WASM runtime, VFS) — *the doc some notes call "backend_architecture_audit.md"; canonical name is this one* |

**Index/catalog companion:** [`CLAUDE_MASTER_BRIEF.md`](./CLAUDE_MASTER_BRIEF.md) — read whenever you need a full ID list or source-file map.
**IGNORE:** `docs/master/*EXECUTION*` (stale 2026-02–04).

---

## 3. Three surgical execution phases

These phases are the **lens** over the waves — they tell you *how* to think while executing Waves 6→9, not a replacement for them.

### Phase A — The UI/UX Revolution
**Goal:** A workbench that feels like it rivals UE5 / Blender.
- **No visual pollution** — contextual tools: panels, AI menus, and inspectors appear when needed, vanish when not.
- **The 3D Canvas is king** — chrome serves the viewport, never competes with it.
- **Premium aesthetic** — tactical glassmorphism, high-contrast dark mode, ultra-legible typography, consistent `var(--aethel-*)` tokens.
- **Scope:** resolve the **26 points** in `critical_user_experience_audit.md` (+1 social) — Wave 7 owns most.

### Phase B — The Canvas & Human-in-the-Loop (Actor–Critic)
**Goal:** The AI **proposes**; the human **edits the scene**. Never let the AI operate blind.
- **Gizmos** — translate/rotate/scale handles for direct manipulation of AI-placed objects.
- **Timeline Undo** — every AI mutation is a reversible, inspectable step.
- **Context Patches** — the human corrects the AI's intent inline; the correction feeds back.
- **Physics "X-Ray" mode** — visualize colliders/forces so the AI's spatial reasoning is auditable.
- **Source of truth:** `implementation_plan.md` (Human-in-the-loop mechanics).

### Phase C — The Destruction of Placebos
**Goal:** Every button maps to a real, blinded transaction core — or it's honestly labeled.
- Read `audit_backend_spine.md`: API mocks, **USDZ/GLB export theater**, **fake WASM runtime**, **RAG `.includes()`**, asset-flattening loader.
- **Do not** ship a button that pretends. Either plug the UI into the real core (billing, metering, jobs) or show `[Em Breve]` / `[HELD]`.
- See the **Placebo → UI honesty matrix** in §4.4.

---

## 4. The quality bar (non-negotiable)

### 4.1 Market standard
The end user must feel a AAA tool. Honesty is part of the premium feel — a held feature stated plainly beats a polished lie.

### 4.2 Engineering bar (from `CLAUDE_MEGA_WAVES.md`)
| Dimension | Bar |
|-----------|-----|
| Honesty | Held manifest + gate; never rename a placebo |
| Performance | No sync GPU readback inside the frame loop |
| Data fidelity | No silent loss (foliage, rigs, netcode, saves) |
| Physics | Rapier WASM; no JS fake fragments |
| IDE | Dock persistence, virtualized trees, single AI spine |
| Billing | Weighted tokens; two-phase settle; BYOK never logged |

### 4.3 Honesty Gate (apply to every UI element)
```
Does this control trigger a REAL backend transaction?
  ├─ YES → ship it, wire telemetry + error states
  └─ NO  → is the pipeline landing this Wave?
            ├─ YES → build behind a feature flag, ship together
            └─ NO  → render [Em Breve]/[HELD] with manifest link — NEVER a dead button
```

### 4.4 Placebo → UI honesty matrix
| Placebo (backend) | Current UI risk | Required action | Wave |
|-------------------|-----------------|-----------------|------|
| Export USDZ/GLB (fake job → 503) | "Export" button looks real | Real RenderJob pipeline OR `[HELD]` | 6 |
| Plugin install (503 stub) | Install button → broken | Real install OR `[Em Breve]` | 8 |
| Marketplace remix | No clone API | Build clone API before "Remix" CTA | 8 |
| WASM visual-script compiler | "Compile to WASM" implies native | Honest "interpreted" label until transpile real | 7/2 |
| Semantic search / RAG | "AI knows your repo" | pgvector embeddings OR scope-honest copy | 1 |
| Terminal | Looks local, runs on cloud host | Tauri PTY OR labeled "cloud shell" | 9 |
| Arcade publish | No `/arcade`, no deploy | Build deploy before "Publish to Portal" | 8 |

---

## 5. Wave execution map (business track first)

| Wave | Name | Key DEBTs | Exit criteria |
|------|------|-----------|---------------|
| **6** | Billing + schema spine | FIN-005–013, BILLING-001, RENDER-001, DB-001–003 | Plans parity; webhook downgrade; token weights; BYOK proxy MVP; RenderJob in Prisma |
| **7** | Studio UX + ops + generosity | CSP-001, OPS-001, UX-DASH-*, DESK-007, ADMIN-002 | Tiered fail-open; Resume Workspace; no tier agent lock; Electron removed; Phase A done |
| **8** | Arcade + Marketplace + deploy | INFRA-001, PLUGIN-001, DB-002 | Remix clone API; asset gateway scan; arcade feedback→task |
| **9** | Desktop native + local AI | TERM-001, DESK-002–004, DESK-006 | PTY on user machine; fs_watch bridge; ONNX path or honest held |

**Engine track (parallel after Wave 6 stable):** Wave 1 AI spine (AI-001/002, SEARCH-002) · Wave 2 collab/netcode (YJS-001, NET-001) · Wave 3 render (RENDER-003, RT-001, VT-001, NANITE-001) · Wave 4 world sim (FOLIAGE-001, CLOUD-001, ASSET-001) · Wave 5 character sim (MOTION-001, CLOTH-001, DEST-001).

Full bundles + acceptance: [`CLAUDE_MASTER_BRIEF.md`](./CLAUDE_MASTER_BRIEF.md) §6 and [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md).

---

## 6. Wave 0 preflight (run every session)

```bash
cd meu-repo/cloud-web-app/web
npm run qa:enterprise-gate
npm run typecheck
npm test
```

If any gate is red, fix the gate before starting the Wave — do not stack new work on a broken baseline.

---

## 7. Plan matrix (canonical quick reference)

| | Free | Starter | Pro Platform | Pro +IA | Studio Platform | Studio +IA |
|--|------|---------|--------------|---------|-----------------|------------|
| **USD/mo** | $0 | $9 | $15 | $29 | $45 | $79 |
| **Cloud projects** | 1 | 3 | ∞ | ∞ | ∞ | ∞ |
| **Local Tauri** | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |
| **Storage** | 250MB | 2GB | 14GB | 14GB | 60GB | 60GB |
| **AI weighted/mo** | 200K | 1M | BYOK | 4.5M | BYOK | 18M |
| **requests/day** | 50 | 720 | 2880 | 2880 | 7200 | 7200 |
| **BYOK** | ✅ $0 | ✅ | default | optional | default | optional |
| **Ultra (200×)** | Wallet/BYOK | Wallet/BYOK | Wallet/BYOK | Wallet/BYOK | Subscription | Subscription |
| **Yjs write seats** | 0 | 0 | 2 | 2 | 3 | 3 |
| **Yjs spectator** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Agents/workspaces** | All | All | All | All | +Custom | +Custom |

**Closed:** Basic grandfather $29 → Pro+IA entitlements; no `starter_trial`; no credit packs; Enterprise = Contact Sales.
Authoritative detail: `contracts_planning.md` §8.

---

## 7b. Cross-cutting concerns (sub-needs — grounded in code)

Market leadership is not only features; these horizontal qualities decide whether the product *feels* AAA. Status below is verified against the repo (no guesses).

| Concern | Evidence in repo | Status | Action / ID | Wave |
|---------|------------------|--------|-------------|------|
| **i18n** | full `i18next`/`react-i18next` stack + ~7 `qa:i18n-*` gates; EN canonical | ✅ Strong | Keep PT-BR from drifting; gates already enforce | — |
| **Testing** | `vitest` + `jest` + `@testing-library` + `playwright` visual-regression | ✅ Strong | Keep coverage on new Wave code | 0 |
| **Observability** | `lib/observability/logger.ts` + `tracing.ts`; many `qa:agent-observability` gates | ✅ Present | Ensure new flows emit structured logs/traces | 7 |
| **Error tracking** | `@sentry/nextjs ^8.47.0` dependency present | ⚠️ Unverified wiring | `IMPROVE-OPS-003`: confirm config + PII scrubbing (never log BYOK) | 7 |
| **Accessibility** | only `@storybook/addon-a11y`; **no app-level a11y CI** | ❌ Gap | `IMPROVE-A11Y-001`: jsx-a11y + axe on shells; keyboard/focus/reduced-motion | 7 |
| **Compliance (LGPD/GDPR)** | no account delete/export route (`app/api/account/*` missing) | ❌ Gap | `IMPROVE-COMPLIANCE-001`: erasure + data export + retention policy | 6/7 |
| **Disaster recovery** | **no backup/cron tooling in repo** | ❌ Gap | `IMPROVE-OPS-002`: Postgres PITR + tested restore runbook (RPO/RTO) | 6 |
| **Security headers / CSP** | `middleware.ts` sets CSP + rate limit | ⚠️ Needs fix | `DEBT-CSP-001` localhost in prod; `DEBT-OPS-001` fail-open | 7 |

**Rule for Claude:** when a Wave touches a surface, also satisfy the applicable cross-cutting concern (a11y on any new UI; erasure/export on any new account data; logs/traces on any new pipeline). Do not defer silently — if not done, leave a `[HELD]` note and a registry line.

---

## 8. Status

| Layer | Spec | Code | Wave |
|-------|------|------|------|
| Billing / contracts | ✅ 100% | ❌ | 6 |
| UX generosity / Phase A | ✅ 100% | ❌ | 7 |
| Ops resilience | ✅ 100% | ❌ | 7 |
| Social (Arcade/Marketplace) | ✅ 100% | ❌ | 8 |
| Desktop native / local AI | ✅ 100% | ❌ | 9 |
| AI spine | ✅ 100% | ⚠️ partial | 1 |
| Engine simulation | ✅ documented | ❌ placebos | 2–5 |
| Cross-cutting (a11y/LGPD/DR) | ⚠️ partial spec | ❌ gaps found | 6–7 |
| Enterprise gate | — | ✅ GREEN | 0 |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-19 | v1 — front-door mission brief: truth table, 11-doc reading order, 3 phases (A/B/C), AAA bar, Honesty Gate, placebo→UI matrix |
| 2026-06-19 | v1.1 — §7b cross-cutting concerns grounded in code (i18n/test/obs strong; a11y/LGPD/DR gaps); 4 new `IMPROVE-*` (A11Y-001, COMPLIANCE-001, OPS-002, OPS-003) |
| 2026-06-19 | v1.2 — Wave 6 verified largely pre-built (token weights/webhook downgrade/BYOK/RenderJob); shipped `COMPLIANCE-001` end-to-end (export+erasure API+UI+retention policy); killed marketplace install placebo (real API + honest states, dead "Configure" removed); confirmed #21/#24/#25 already done |
