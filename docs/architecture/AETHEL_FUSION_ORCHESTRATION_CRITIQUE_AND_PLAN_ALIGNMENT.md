# Aethel Engine — Fusion Orchestration Critique & Plan Alignment

**Version:** 1.1 (Chief Architect — **#62 APPROVED**)  
**Status:** **Binding critique** — does **not** invent new SKUs/prices; does **not** claim code exists  
**Date:** 2026-07-09  

**Parents:**  
[`AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md`](./AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md) v1.2 (#59–#61) ·  
[`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md) ·  
[`AETHEL_APEX_DOCTRINE_AND_EXECUTION_FOCUS.md`](./AETHEL_APEX_DOCTRINE_AND_EXECUTION_FOCUS.md) ·  
[`AETHEL_AI_FUSION_CREATIVE_SPEC.md`](./AETHEL_AI_FUSION_CREATIVE_SPEC.md) ·  
[`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md)

---

## 0. Verdict (one page)

| Question | Answer |
|----------|--------|
| Are Maestro Delegation + MoA + Auto-Heal the right architecture? | **Yes** — keep #59–#61 as the Fusion spine |
| Biggest risk now? | **Spec ahead of code** + **MoA cost/latency explosion** if every chat fans out |
| How to improve without losing quality? | **Tighten gates, budgets, UX honesty, and ship order** — not add more model brands |
| Align with plans ($29 dual-pool)? | **Yes** if MoA scoped + Maestro saves Premium + composer shows $ before send |
| What must we **not** pretend is live? | Law XVI trio files, L.5 project gate, MoA orchestrator, PAYG/wallet settlement, OrchestratorProd |

**Golden rule:** *Improve the orchestration by making it **narrower, metered, and evidence-backed** — never by promising AAA combat from one prompt or by demoting to Nano.*

---

## 1. What to keep (do not dilute)

| Idea | Why it stays |
|------|----------------|
| Apex-first / ban Nano (#55–#57) | Quality floor |
| Maestro Delegation (#61) | Saves Premium + wall-clock |
| MoA ≤3 on peripherals (#60) | Peer diversity without Sonnet-on-trivia |
| Auto-Heal ↔ L.5 (#60) | Compiler > LLM consensus |
| Yjs + ProjectMemory + Laws (#58) | Zero Amnesia |
| Zero-MVP / hide until real | Engine must not lie |
| Focus 1 → Focus 2 | Absolute execution order |
| Prices $0/$9/$29/$79 + dual-pool | Canonical plans — **unchanged** |

---

## 2. What to improve (concrete, non-hallucinated)

### 2.1 Orchestration quality (ideas → sharper rules)

| Gap in current ideas | Improvement (binding recommendation) |
|----------------------|--------------------------------------|
| “≤3 generators always” | **Adaptive MoA width:** Risk&lt;40 → **1** gen; 40–69 → **2**; ≥70 or polish → **3**. Cuts Fast burn without quality cliff on hard tasks |
| “≤4 peripheral cells” | Cap by **JobBudget weighted tokens**, not only cell count — one fat lighting MoA can equal four small ones |
| Maestro “critical nucleus” vague | Require Maestro output schema: `criticalTask` + `peripherals[]` with **TaskDomain + allowedPaths + successCriteria** — Critic rejects vague plans |
| Synthesizer may rubber-stamp | Synthesizer must cite **which generator** each hunk came from; L.5 still sovereign |
| Heal loops on wrong model | Heal **nucleus** with Maestro if Premium left; heal **peripheral** with same MoA cell — don’t burn Sonnet fixing CSS |
| Parallel cells race on same file | **Hard lock:** disjoint `allowedPaths` or serial barrier — already stated; add CI fixture |
| Domain “lighting IA” vs code | Lighting that **writes shaders/TS** still goes through L.5; pure scene param tweaks may use lighter gate (Yjs-only) — document split to avoid over-sandbox |
| User pin Opus | Same Delegation; Ultra still **wallet/BYOK** for Hero — pin does not put Opus on subscription included path |

### 2.2 Plan / billing alignment (no new prices)

| Plan need (canonical) | Orchestration must do |
|-----------------------|------------------------|
| Dual-pool Fast 3M + Premium 37.5K (Pro) | Maestro → Premium; MoA cells → Fast; receipts show pool |
| Premium empty → Fusion Auto Apex (not dumb) | Delegation without Premium = Maestro role on **best Apex OW** or skip Maestro for trivial |
| IDE stays open | Heal FAIL → toast + wallet/BYOK/PAYG CTAs — never lock IDE |
| Composer cost chip | **Estimate before send:** Maestro tokens + N×MoA cells + heal reserve |
| Creative ≠ LLM pool (Creative Wallet) | Asset search / image / video **never** debit Premium; Bridge + Creative Wallet (6F) |
| Debit order: Fast → Premium → wallet → PAYG | CostGuard MoA envelope follows same ladder; **one debit path** (fix GAP-PAYG-01) |
| Starter = Fast only | No Maestro Premium path; MoA Apex OW only; Sonnet → wallet/BYOK modal |
| Free = free models + 200K | MoA **disabled** or single free Apex only — **no** 3× fan-out on Free |
| Ultra 200× | Never on included sub; Hero only |

### 2.3 Law XVI / J / L alignment (quality without mocks)

| Need | Improvement |
|------|-------------|
| J.1 choke | **All** Maestro + MoA + heal provider calls through CreativeBridge + CostGuard |
| Trava II | Mission APPLY = one or sequenced FusionTx; Ctrl+Z reverts Swarm+Maestro together when barrier apply |
| Trava III | Stealth combat UX = scaffold + evidence — **not** auto-GTA |
| L.5 | Ship **real** project typecheck in sandbox before marketing Auto-Heal |
| L.14 / Laws | No MoA/Maestro write without pack — already #58; add golden fixture |
| Evidence ledger | Log `maestroPlanId`, cell ids, modelIds, apexRank, pool, heal rounds |
| Zero-MVP | File Explorer / renderer still Focus 1–2 — Swarm must not fake viewport success |

### 2.4 Anti-hallucination (honest ship state)

| Claim | Reality today | Safe language |
|-------|---------------|---------------|
| MoA / Maestro / Auto-Heal | **Spec only** (#59–#61) | “Architecture approved — Focus 1A implements” |
| CreativeBridge / CostGuard / FusionTx | **Files missing** | Block 1 / J.1 P0 |
| L.5 project gate | **Partial** (single-file parse) | L.5 acceptance before Auto-Heal marketing |
| Orchestrator 25 roles | **disabled** in prod | J.12 after Bridge |
| PAYG / wallet Stripe | **NOT LIVE** | Block 6; CTAs can be `[HELD]` |
| “Character on screen with combat” | Engine depth partial | Evidence-backed apply only |

**Prohibition:** Marketing or UI that implies MoA Auto-Heal is live before Focus 1A exit + L.5 green on GF fixture.

---

## 3. Recommended refinements — **Decision #62 APPROVED**

**#62 — Adaptive MoA + Metered Delegation** — **APPROVED** (Founder 2026-07-09). Binding in Swarm **v1.3**.

**Founder one-liner:** *Orquestrador ajusta quantos e quais Apex entram por Risk/domínio; Premium = Maestro no núcleo, não elenco fixo de 3; trivial não queima Sonnet; Free não faz fan-out.*

| # | Rule (binding) |
|---|----------------|
| 1 | **Adaptive width** Risk&lt;40 → **1**; 40–69 → **2**; ≥70 or polish → **3** |
| 2 | **Trivial bypass:** Risk&lt;25 + single TaskDomain peripheral → **no Maestro**, single Apex Fast |
| 3 | **Preflight estimate** mandatory in J.2 composer (Fast/Premium/$) |
| 4 | **Free tier:** MoA fan-out **off** (max 1 model) |
| 5 | **Starter:** MoA max **2** gens; no Premium Maestro |
| 6 | **Heal routing:** nucleus→Maestro if Premium; else Apex; peripheral→same cell |
| 7 | **Mission barrier:** APPLY only when all required cells L.5 PASS (or honest partial UI) |
| 8 | **Telemetry:** p50 tokens/cell, heal rate, Premium saved vs solo-Premium baseline |

Canonical detail: [`AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md`](./AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md) §1.1b.

---

## 4. Alignment matrix — plans × orchestration × quality

| Plan / doctrine | Orchestration lever | Quality lever |
|-----------------|---------------------|---------------|
| Pro dual-pool | #61 saves Premium; MoA on Fast | Apex-only gens |
| Studio org pool | Member caps on MoA cells (6H) | Same L.5 |
| Enterprise | Higher Fast → more MoA cells OK | Same Apex registry |
| BYOK | Maestro/MoA on user keys; $0 platform AI | Still Laws + L.5 |
| Local Tauri ∞ projects | Swarm still metered if cloud LLM | Local FS Focus 1B |
| Wedge web-first | MoA applies to web TS path first | Don’t wait for full desktop AAA |
| Focus 1 then 2 | Implement Bridge+MoA before terrain glory | No fake renderer |

---

## 5. What would **hurt** quality or plans (reject)

| Temptation | Reject because |
|------------|----------------|
| Nano / flash-lite Workers to “save MoA $” | Violates #55–#57; retention cliff |
| MoA on every keystroke / chat | Blows Fast 3M; latency hell |
| Skip L.5 “when models agree” | Hallucinated ship |
| Sonnet solos everything when pinned | Burns 37.5K; contradicts #61 |
| Fake combat/character success | Zero-MVP / Trava III |
| New retail prices to “pay for MoA” | Plans canonical frozen |
| Implement Hub cosmetics before Focus 1 | Dilutes absolute focus |

---

## 6. Execution priority (aligned, non-hallucinated)

```
Block 0 preflight
  → Focus 1A: Law XVI trio + Laws gate + Apex registry
      → maestro-delegation.ts + MoA width policy
      → CostGuard envelope + evidence
      → wire L.5 real project gate + auto-heal (even if heal v1 = single repair)
  → Focus 1B: real File Explorer
  → Focus 2: renderer + terrain
  → Block 6: wallet/PAYG (money path) — composer $ chip can land with 6H
```

**Do not** build Debater/MoA UI chrome before Bridge+CostGuard exist.

---

## 7. Checklist

- [x] Keep #59–#61 spine  
- [x] List improvements that raise quality **and** protect $29 math  
- [x] Align dual-pool, Creative Wallet, IDE-open, debit order  
- [x] Honest gap vs live code  
- [x] Founder approve **#62** Adaptive MoA + Metered Delegation  
- [ ] Claude Focus 1A implements without claiming live MoA in marketing  

---

## 8. Changelog

| Date | Ver | Change |
|------|-----|--------|
| 2026-07-09 | 1.0 | Critique + plan alignment; #62 candidates; anti-hallucination matrix |
| 2026-07-09 | **1.1** | **#62 APPROVED** — Adaptive MoA binding; points to Swarm v1.3 |
