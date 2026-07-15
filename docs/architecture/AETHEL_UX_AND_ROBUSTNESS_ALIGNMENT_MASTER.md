# Aethel Engine — UX & Internal Robustness Alignment Master

**Version:** 1.0 (Chief Architect — critiques × all plans × depth bar)  
**Status:** **Binding** — every Block must satisfy UX journeys + robustness checks before “best-in-market” claims  
**Purpose:** One map that aligns **all** architecture plans with user-facing quality and internal depth — so Claude never ships scaffolding as product.

**Read with:**
- [`AETHEL_TECHNICAL_DEPTH_AND_ROBUSTNESS_GAP.md`](./AETHEL_TECHNICAL_DEPTH_AND_ROBUSTNESS_GAP.md) — plans × code scores
- [`AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`](./AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md) — blocks/rounds
- [`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md) — billing UX J1–J7
- [`critical_user_experience_audit.md`](./critical_user_experience_audit.md) — 26 points
- [`user_experience_criticism.md`](./user_experience_criticism.md) — end-user redesigns
- [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) — A4–A50 hitlist
- [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md) — IMPROVE-*
- [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) — DEBT-*

---

## 0. North star (user + engine)

| Pillar | Meaning | Competitor bar |
|--------|---------|----------------|
| **Feel safe** | No surprise bills, no data loss, no fake success | Cursor + Stripe |
| **Feel fast** | IDE 60fps chrome; viewport pauses when hidden; virtualized lists | Zed + UE outliner |
| **Feel honest** | `[HELD]` / maturity badges; no Nanite/unlimited AI lies | Platform Reality Doctrine |
| **Feel powerful** | Agents apply with undo; dual AI pools; local ∞ projects | Cursor + Tauri moat |
| **Feel shippable** | Publish → play → earn with real artifacts | Itch + Roblox |
| **Feel robust** | Single choke paths; load tests; evidence ledgers; OTEL on money/AI | Stripe ops |

**Rule:** If a PR improves a library but the **user journey** does not change, it is incomplete unless marked infrastructure-only with a follow-up UX ticket.

---

## 1. Critique → plan → block matrix (all sources)

### 1.1 Critical UX audit (#1–#26)

| # | Critique | Plan / Law | Block | Status note |
|---|----------|------------|-------|-------------|
| 1 | UsageBucket row lock | PAYG / Unit Economics | **6G** | Redis buffer |
| 2 | Transfer deadlock | billing_security | **6G** | Sorted FOR UPDATE |
| 3 | Stripe delay = free Pro | contracts §3 | **6D** | Lazy reconcile |
| 4 | Hourly caps break flow | Plans Canonical §5 | **6A** | Monthly + requests/day only |
| 5 | BYOK / seats / MP policy | Plans Canonical | **6E** + H | Modular BYOK |
| 6 | Export mock after pay | Zero-MVP / IMPROVE-UX-007 | **6** / 7 | `[HELD]` until real |
| 7 | Pricing lists unbuilt features | Plans §10.4 | **6H** | Manifest gate |
| 8 | WebGL while editing Monaco | ENG-023 / Studio | **3** / 7 | Pause `useFrame` |
| 9 | Git vs Yjs overwrite | Netcode / Yjs | **2** | Branch-scoped doc |
| 10 | Silent save on WS drop | Law VIII / UX-008 | **2** | IndexedDB buffer + LED |
| 11 | VS port magnetism | audit A4 / VS | **7** | Snap + fuzzy |
| 12 | Playtest console lost | IDE-018 | **7** / 9 | postMessage / IPC |
| 13 | Console 100 log cap | IDE-019 | **7** | Virtualize 5k |
| 14 | GLTF flatten kills rig | S7 / ASSET-001 | **4** / S7 | Preserve hierarchy |
| 15 | Film audio cramped | FILM-001 | **7** | Slot swap |
| 16 | Marketplace install | Marketplace | **8** | Fixed 2026-06-19 — verify |
| 17 | Dashboard banner stack | DASH-001 | **7** | Single intent row |
| 18 | MCP stdio in browser | Platform / L | **6** / 9 | SSE web; stdio Tauri |
| 19 | Substring “RAG” | AI Fusion / J.4 | **1** | Real embeddings |
| 20 | No workspace auto-index | Forge / J | **1** / 9 | Crawler worker |
| 21 | AI-tunneling dashboard | UX-009 | **7** | Resume Workspace — deepen restore |
| 22 | Electron + Tauri dual | Desktop | **9** | Kill Electron templates |
| 23 | Orphan admin 404 | ADMIN-002 | **7** | Delete or thin pages |
| 24 | CSP loopback | Security | — | DONE — keep regression test |
| 25 | Fail-closed rate limit | Ops | — | DONE fail-open — keep |
| 26 | RenderJob errors swallowed | RENDER-001 | **6** | Surface migration errors |

### 1.2 End-user criticism (user_experience_criticism)

| Critique | Adopted in | Block |
|----------|------------|-------|
| Local projects ∞ | Plans Canonical §6 | Already in `plans.ts` — enforce UX copy |
| Workspace profiles Code/Research/Game | Studio / IMPROVE-STUDIO-012 | **7** |
| BYOK all tiers | Plans §3 / DEBT-BILLING-001 | **6E** |
| Token weight transparency | Plans §10 / PAYG §4.5 | **6H** composer chip |
| Collab = Yjs seats not Git | contracts | **2** / 6 |

### 1.3 Technical depth gap (infra)

| Deepener | User feels | Block |
|----------|------------|-------|
| spend-resolver | Fair bills, no double charge | **6A** |
| Law XVI trio | Undo AI; no free bleed | **1** |
| Wallet Stripe | Buy credits works | **6B** |
| Creative Wallet | Video ≠ kill Premium | **6F** |
| Usage UX 6H | See cost before send | **6H** |
| Honest Nanite/RT names | Trust | **3** |
| Real or P2P-only MP | Trust | **2** |
| Cook workers | Publish works | **6**/S7 |
| H.0 RevenueLane | Fair creator pay | **H.0** |
| OTEL AI+billing | Ops reliability → uptime UX | **6G** |
| GAS IPC | Play mode feels real | **5** |
| GF fixtures on disk | Quality ratchet | **0→A.1** |

### 1.4 Frontend hitlist (A4–A50 → Block 7)

| Frente | User pain | Must |
|--------|-----------|------|
| A4 | VS looks broken / unthemed | Zero inline styles; tokens |
| A8 | Outliner dies at scale | Virtualize |
| A11 | Console unusable | Virtualize logs |
| A21/A36 | Docking not pro | Dockview / persist layout |
| A40 | AI apply opaque | Monaco ghost decorations |
| Loading | Feels cheap | Shimmer system |
| Remount | WebGL flash on route | Preserve canvas context |

Full list remains in `audit_frontend_ui_ux.md` — Block 7 must close **A3–A11, A14, A17, A21, A36, A40** minimum (Mega Waves).

---

## 2. Universal quality gates (every Block exit)

### 2.1 User experience gates

| Gate ID | Check | Fail = |
|---------|-------|--------|
| **UX-G1** | Primary journey of Block has calm EN copy | Reject |
| **UX-G2** | Error states never say suspended/banned for quota/ops | Reject |
| **UX-G3** | Incomplete features show `[HELD]` or maturity badge | Reject |
| **UX-G4** | IDE/editor remains usable if AI/cloud fails (Law VIII) | Reject |
| **UX-G5** | Cost or destructive action has preview / confirm | Reject |
| **UX-G6** | Lists >100 rows virtualized | Reject |
| **UX-G7** | No WebGL burn when viewport hidden (ENG-023) | Reject on IDE PRs |
| **UX-G8** | i18n EN; no PT-BR UI; tokens only | Reject |

### 2.2 Internal robustness gates

| Gate ID | Check | Fail = |
|---------|-------|--------|
| **RB-G1** | Single choke path for domain (money/AI/render/net) | Reject |
| **RB-G2** | Concurrent safety test where money/AI/net | Reject |
| **RB-G3** | Cancel/abort releases locks/reservations | Reject |
| **RB-G4** | Idempotent external webhooks | Reject |
| **RB-G5** | `createComponentLogger` — no console.log | Reject |
| **RB-G6** | Evidence/receipt for agent mutations | Reject |
| **RB-G7** | Dual-stack: typecheck+lint+test; cargo if `.rs` | Reject |
| **RB-G8** | Depth bar §1 from Technical Depth Gap | Mark PARTIAL/`[HELD]` |
| **RB-G9** | No new parallel system when module exists unwired | Prefer wire |
| **RB-G10** | Golden fixture ID cited if domain has GF-* | Playbook |

### 2.3 Marketing honesty gates

| Gate ID | Check |
|---------|-------|
| **MK-G1** | UI claim ⊆ live entitlement in `plans.ts` |
| **MK-G2** | No Nanite/Lumen/unlimited AI / cross-play until acceptance |
| **MK-G3** | Pricing page features ⊆ shipped or `[HELD]` |

---

## 3. User journey map (product-wide)

| Journey | Happy path | Failure path (must be excellent) | Blocks |
|---------|------------|----------------------------------|--------|
| **J-Onboard** | Free → local project → free-model chat | Soft CTA upgrade; IDE open | 6, 7 |
| **J-Create** | Code/Game profile → edit → save (Yjs/local) | Offline buffer + sync LED | 2, 7, 9 |
| **J-AI** | Composer cost chip → agent apply → Ctrl+Z | 402 calm; Bridge+CostGuard | 1, 6H |
| **J-Collab** | Invite seat → presence → no overwrite | Branch-scoped Yjs; conflict UI | 2 |
| **J-Playtest** | Play → console logs → stop | Logs bridged; no silent fail | 7, 9 |
| **J-Publish** | Cook → deploy → Arcade playable | Real artifact or `[HELD]` | 6, 8, S7 |
| **J-Earn** | Store sale → Treasury → payout | H.0 lanes; no fake earnings UI | H |
| **J-Team** | Studio org pool + caps | Member-only block | 6H |
| **J-BYOK** | Keys local → unlimited provider | Never log keys | 6E |
| **J-Desktop** | Tauri PTY + wgpu viewport | Sidecar health; no agent host PTY | 9 |

Billing journeys **J1–J7** remain in Plans Canonical §10.3.

---

## 4. Plan-by-plan alignment (what each spec owes the user)

| Spec | User promise | Robustness debt to close |
|------|--------------|--------------------------|
| Plans Canonical + PAYG | Fair AI spend, visible meters | 6A–6H |
| Unit Economics | No platform bleed | spend-resolver, Ultra wallet-only |
| AI Fusion (XVI) | Creative with undo + cost guard | **Create 3 missing files** |
| Provider matrix | Honest modalities | Creative Wallet; no fake providers |
| Netcode S6 | Play with friends | Protocol + authority honesty |
| AAA / G.3 | Beautiful viewport (desktop) | Frame graph; gate names on web |
| World S2 | Paint worlds that scale | Foliage erase; GPU water |
| Animation S3 | Cinematics that export | Real sequencer export |
| MetaSounds S4 | Audio that isn’t a play-log | Graph compile path |
| Gameplay S5 | Abilities that tick | GAS IPC 60Hz |
| Content S7 | Import without killing rig | ASSET-001 |
| Commerce H | Earn fairly | H.0 RevenueLane |
| Hub I | Be discovered | Telemetry before reviews |
| Hardware XV | Runs on their GPU | Capability Score + SRG |
| Forge L | Agent fixes repos | Sandbox; no host PTY |
| Immunity M | No hitch / crash isolation | PSO vault; WASM shield |
| Execution Playbook | Quality ratchet | **GF-* files on disk** |
| Technical Depth Gap | Honest scores | Re-score after each Block |

---

## 5. Block quality contracts (summary)

| Block | UX contract | Robustness contract |
|-------|-------------|---------------------|
| **0** | — | Registry truth only |
| **1** | Agent apply visible + undo | Law XVI trio + single LLM path |
| **2** | Collab without data loss; sync LED | Versioned net OR P2P-only; Yjs branch scope |
| **3** | Viewport quality + pause when hidden | Wire AAA or strip toggles; honest names |
| **4** | World tools survive production scenes | Per-instance foliage; no mesh-per-instance |
| **5** | Characters feel physical | Rapier fragments; cloth capsules |
| **6** | Billing journeys J1–J7 + 6H | spend-resolver; Stripe; caps; OTEL |
| **7** | UE/Blender density; A-hitlist | Virtualize; dock persist; no remount |
| **8** | Publish→play; voice real | TTS non-zero; Arcade playable |
| **9** | Local power user | PTY; sidecar health; wgpu parity gate |

Detailed rounds for **2** and **3**: Execution Master Map §6 (expanded).

---

## 6. Claude session mandate (copy)

```
Before coding any Block:
1. Read AETHEL_UX_AND_ROBUSTNESS_ALIGNMENT_MASTER.md §1 matrix for that Block’s critiques.
2. Read AETHEL_TECHNICAL_DEPTH_AND_ROBUSTNESS_GAP.md for depth scores.
3. Exit only when UX-G* + RB-G* gates for the Block are green (or honest [HELD]).
4. Prefer wiring existing modules; forbid parallel stubs in ship path.
5. Cite competitor bar in PR: Cursor | Stripe | Roblox | UE | Itch.
```

---

## 7. Changelog

| Date | Ver | Change |
|------|-----|--------|
| 2026-07-09 | 1.0 | Critique×plan×block matrix; UX/RB/MK gates; journeys; plan-by-plan debts |
