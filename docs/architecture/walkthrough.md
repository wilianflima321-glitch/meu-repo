# Walkthrough — Iteration Close (Planning & Audit Phase)

**Status:** **CLOSED** — analytical phase complete (2026-06-17)  
**Master index:** **[`CLAUDE_MASTER_BRIEF.md`](./CLAUDE_MASTER_BRIEF.md)** ← **Claude starts here** (full inventory, tiers, prompts)  
**Next phase:** Implementation — trigger with **"Execute Wave N"**

---

## 1. What this iteration accomplished

This session consolidated **product, billing, security, and UX** requirements into executable specs — without shipping code changes. The platform now has a single story from Free tier through Enterprise, public vitrines (Arcade + Marketplace), and Wave-ordered execution.

| Deliverable | Artifact | Contents |
|-------------|----------|----------|
| **UX & technical audit** | [`critical_user_experience_audit.md`](./critical_user_experience_audit.md) | **26** code-validated critique points (#1–#26) + polish backlog §H |
| **Social / public layer** | [`contracts_planning.md`](./contracts_planning.md) §11–§13 | Arcade portal, Marketplace remix, asset security gateway |
| **Billing & API contracts** | [`contracts_planning.md`](./contracts_planning.md) §2–§9 | Cloud/local projects, Stripe base+addon, BYOK, fail-open, plan matrix §8 |
| **Billing economics** | [`billing_security_analysis.md`](./billing_security_analysis.md) | Token weights, margins, Redis metering, tiered fail-open §11, BYOK §12 |
| **Wave 6 implementation steps** | [`implementation_plan.md`](./implementation_plan.md) | Executor checklist + §11 plan decisions |
| **Debt & improvement catalog** | [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md), [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md) | ~89 `DEBT-*`, ~120+ `IMPROVE-*` |
| **Mega-wave execution brief** | [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) | Full Wave 1–9 engine + platform blocks |

**Coverage note:** **27** total scope items = **26** numbered audit points + **1** social-layer contract block (Arcade + Marketplace + gateway, formerly informal).

---

## 2. Canonical read order (executor)

```
0. master_mission_briefing.md       ← FRONT DOOR: mission, AAA quality bar, 3 phases, Honesty Gate
1. walkthrough.md                    ← iteration close + spec-vs-code orientation
2. contracts_planning.md             ← API/Stripe/BYOK/public vitrines (authoritative contracts)
3. implementation_plan.md            ← Wave 6 billing steps + Human-in-the-loop
4. billing_security_analysis.md      ← unit economics + ops policy
5. CLAUDE_MEGA_WAVES.md              ← which DEBT/IMPROVE bundles per Wave
6. critical_user_experience_audit.md ← UX acceptance context
7. AI_CRITIQUE_DEBT_REGISTRY.md      ← evidence IDs
8. CLAUDE_MASTER_BRIEF.md            ← full catalog + source-file map (companion)
```

**Ignore:** `docs/master/*EXECUTION*` (stale).

---

## 3. Decisions locked this iteration

### Billing & plans

- **Stripe:** Base platform ($15 Pro / $45 Studio) + optional IA addon ($14 / $34) → $29 / $79 bundles
- **Basic legacy:** Grandfather **$29** Price ID → entitlements **Pro + IA** in Next.js
- **Starter trial:** Eliminated → **`free`** is permanent entry
- **Credit packs:** Discontinued → **Credit Wallet** + BYOK
- **CDN:** Soft stop at tier included GB; hard stop at **120%**
- **Enterprise:** Internal template; **Contact Sales** only

### IDE generosity (no tier lock on intelligence)

- All **standard agents** + **workspace profiles** + **marketplace install** on every tier
- Monetize **infra only:** cloud storage, CDN deploy, Yjs write seats, platform premium/ultra models, cloud MP servers

### Security & resilience

- **BYOK:** Client-held keys; proxy bypasses platform token quota; **10 req/min** anti-DDoS
- **Rate limits:** Monthly weighted tokens + daily spam gate; **no hourly cap**
- **Fail-open:** Tiered — IDE authenticated APIs open; auth/billing fail-closed
- **CSP:** Loopback allowed in production for hybrid MCP/playtest

### Public layer (Secure Sandbox → vitrines)

- **Private workspace:** Cloud (Postgres) or local (Tauri FS) — unlimited local
- **Aethel Arcade:** Deploy/play portal; ratings; feedback → **developer task backlog**; Aethel Pay IAP
- **Marketplace:** Publish snapshot; **Remix** = async clone to private sandbox; `aethel://` deep links
- **Asset gateway:** Scan → optimize → normalize before any public blob

---

## 4. Recommended execution order (Wave 6 → 9)

Preflight before **every** Wave:

```bash
npm run qa:enterprise-gate
npm run typecheck
npm run lint
```

### Wave 6 — Billing spine & platform truth

**Goal:** Money cannot bleed; plans enforceable; schema honest.

| Source | Scope |
|--------|--------|
| `implementation_plan.md` §1–§7 | Plans parity, token weights, two-phase AI, Redis buffer, Stripe webhook, transfer locks |
| `contracts_planning.md` §3–§4, §7, §9 | Stripe modular SKUs, BYOK proxy, rate-axis unification, migrations |
| `CLAUDE_MEGA_WAVES.md` Wave 6 | `DEBT-FIN-*`, `DEBT-RENDER-001`, `DEBT-DB-001`, `DEBT-BILLING-001` |
| Audit | #1–#3, #26 |

**Acceptance:** `plans.ts` === `plan-limits.ts`; BYOK skips quota; Stripe cancel → free; `RenderJob` in Prisma.

---

### Wave 7 — Studio UX, ops & generosity

**Goal:** IDE feels premium on Free; ops don't outage on third parties.

| Source | Scope |
|--------|--------|
| `contracts_planning.md` §2, §5, §6 | Cloud/local UI split, CSP, fail-open, unlock agents/domains |
| `critical_user_experience_audit.md` | #8, #10, #15, #17, #21–#25 |
| `CLAUDE_MEGA_WAVES.md` Wave 7 | Dock, dashboard, admin orphans, UX hitlist |
| `IMPROVE-*` | `IMPROVE-UX-009`, `IMPROVE-BILLING-007`, `IMPROVE-COLLAB-006` |

**Acceptance:** Resume Workspace; tiered fail-open live; no agent/domain tier gate; Electron removed.

---

### Wave 8 — Social layer & deploy (contracts extension)

**Goal:** Publish/remix/play loops — even if MVP.

| Source | Scope |
|--------|--------|
| `contracts_planning.md` §11–§13 | Arcade, Marketplace remix, asset gateway |
| `IMPROVE-ARCADE-001`, `IMPROVE-MKT-001`, `IMPROVE-MKT-002` | New registry entries |
| `DEBT-INFRA-001` | R2/CDN deploy foundation |
| Audit | #16 marketplace install |

**Note:** `CLAUDE_MEGA_WAVES.md` Wave 8 currently lists Audio/VR — **business Wave 8** (this walkthrough) takes precedence for Arcade/Marketplace until mega-waves doc is reconciled.

**Acceptance:** POST remix clones to private project; publish runs gateway; arcade feedback creates task row.

---

### Wave 9 — Desktop native & local AI

**Goal:** Tauri as sole desktop; offline AI path honest.

| Source | Scope |
|--------|--------|
| `contracts_planning.md` §6 | Local AI sidecar |
| `CLAUDE_MEGA_WAVES.md` Wave 9 | `DEBT-TERM-001`, `DEBT-DESK-*`, `IMPROVE-DESK-004` |
| Audit | #22 Electron removal (if not Wave 7) |

**Acceptance:** `ai_complete` or `[HELD]` badge honest; PTY on user machine; ONNX/WebGPU gated by manifest.

---

## 5. Code vs spec (honest gap)

| Area | Spec | Code today |
|------|------|------------|
| Stripe modular checkout | ✅ | Single Price ID per plan |
| BYOK proxy | ✅ | Not implemented |
| Cloud/local project UI | ✅ | Dashboard mock |
| Arcade / remix APIs | ✅ | Not implemented |
| Marketplace | ✅ | Static curated UI; install 503 |
| 26 audit fixes | ✅ | Documented; mostly open |
| `starter_trial` default | Deprecated | Still on register + Prisma |

---

## 6. How to start implementation

**User prompt (copy-paste):**

```
Execute Wave 6 from walkthrough.md + contracts_planning.md + implementation_plan.md.
Complete the full Wave 6 block in CLAUDE_MEGA_WAVES.md in one series.
Re-run qa:enterprise-gate before and after.
Do not micro-PR individual DEBT tickets.
```

Repeat for Wave 7, 8, 9 when prior Wave gates PASS.

---

## 7. Out of scope until post-Wave 9

- Full engine simulation placebos (Waves 1–5 in mega-waves — parallel track)
- R2 zero-egress at scale (`DEBT-INFRA-001` partial in Wave 8)
- P2P netcode production hardening (`DEBT-NET-001`)
- Aethel Pay live payments (policy only)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | v1 — iteration close; Wave 6→9 order; links all canonical docs |
| 2026-06-17 | Points to **`CLAUDE_MASTER_BRIEF.md`** as primary Claude entry |
