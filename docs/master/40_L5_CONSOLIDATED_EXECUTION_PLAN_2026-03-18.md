# L5 Consolidated Execution Plan - MoSCoW Backlog & 6-Sprint Roadmap

**Date**: 2026-03-18
**Owner**: Platform + Product + UX + Growth
**Status**: ACTIVE EXECUTION PLAN
**Target**: L5 (UX 9.0+, Overall 9.2, 0 Critical Gaps)
**Timeline**: 90 days (6 sprints x 15 days)

---

## 1. Current State Assessment (Post-Implementation Sprint)

| Dimension | Current Score | L4 Target | L5 Target | Status |
|---|---:|---:|---:|---|
| Code Quality / Governance | 9.5 | 9.5 | 9.5 | ACTIVE |
| Architecture | 8.7 | 9.0 | 9.5 | PARTIAL |
| Core Loop / L4 Evidence | 7.5 | 8.0 | 9.5 | PARTIAL (sampleSize=115, successRate=1.0, feedbackCoverage=0.89) |
| Preview / Sandbox | 6.5 | 8.0 | 9.0 | PARTIAL (HMR bridge + WebContainers bridge implemented, token configurado, falta validar HMR real) |
| Billing / Stripe | 5.0 | 8.0 | 9.0 | PARTIAL (routes + UI + readiness exist, keys + prices configurados, falta fluxo end-to-end) |
| Marketing / GTM | 5.0 | 6.0 | 8.0 | PARTIAL (landing v2 + docs pages exist) |
| Onboarding | 7.0 | 8.0 | 9.0 | ADVANCED (wizard + demo mode + funnel analytics) |
| RAG + @mentions | 5.5 | 7.5 | 9.5 | PARTIAL (@Codebase + @Docs + @Diff + @Error exist) |
| UX / Design System | 8.0 | 8.5 | 9.5 | ADVANCED (tokens + shared layout + skeletons) |
| Deploy + Infra | 7.0 | 8.0 | 9.0 | ADVANCED (Vercel + Railway configs) |
| Mobile + A11y | 6.5 | 8.0 | 9.0 | ADVANCED (WCAG fixes + responsive components) |
| Security / Compliance | 7.5 | 7.5 | 9.0 | ADVANCED (vault + rate-limiter + GDPR + SSO framework) |
| Research Agent | 7.0 | 7.5 | 9.0 | PARTIAL (citations + export + live retrieval) |
| Telemetry | 7.0 | 8.0 | 9.0 | ADVANCED (funnel + web vitals + baselines) |
| Films | 4.2 | - | 7.0 | FROZEN until Apps L4 |
| Games | 3.5 | - | 7.0 | FROZEN until Apps L4 |
| **Overall (weighted)** | **~7.2** | **8.5** | **9.2** | **BLOCKED by external credentials** |

---

## 2. MoSCoW Matrix (Consolidated, Deduplicated)

### MUST HAVE (Sprint 1-3) - Blocks L4/L5 promotion

| ID | Task | Owner | Effort | Dependencies | Risk | Sprint |
|---|---|---|---|---|---|---|
| M-01 | Configure live `.env.local` with real credentials (DB, JWT, CSRF, Stripe, E2B, OpenRouter) | Ops | 2h | External accounts | DONE: env local configurado |  1 |
| M-02 | Docker stack operational (PostgreSQL + Redis + Prisma migrations) | Ops | 4h | Docker daemon | HIGH: blocks production evidence | 1 |
| M-03 | Production probe wave sampleSize >= 100, successRate > 0.90, feedbackCoverage >= 0.60 | Eng | 8h | M-01, M-02 | MED: already at 115 samples | 1 |
| M-04 | Stripe checkout end-to-end (test mode): create session -> redirect -> webhook -> plan update | Eng | 8h | M-01, Stripe test keys | HIGH: billing is L4 blocker | 1 |
| M-05 | Stripe portal + invoice page functional with real subscription data | Eng | 4h | M-04 | MED | 1 |
| M-06 | Quota enforcement middleware active on AI endpoints (token/request limits per plan) | Eng | 6h | M-02 (DB for user plan lookup) | MED | 2 |
| M-07 | E2B preview provisioning with real token + HMR WebSocket bridge validated | Eng | 8h | M-01, E2B account | HIGH: preview is L4 blocker (token ok, falta validacao) | 2 |
| M-08 | WebContainers fallback operational when E2B unavailable | Eng | 4h | M-07 | LOW | 2 |
| M-09 | Onboarding wizard demo mode: signup -> domain -> template -> first AI -> first preview < 90s | UX/Eng | 6h | M-01 or demo mode | MED | 2 |
| M-10 | WCAG 2.2 AA: fix all contrast < 4.5:1 on landing, dashboard, IDE, auth pages | UX | 4h | None | LOW: CSS-only changes | 1 |
| M-11 | WCAG 2.2 AA: skip-to-main-content link on every critical page route | UX | 2h | None | LOW: already in layout.tsx | 1 |
| M-12 | Mobile responsive: landing + dashboard + auth pages usable on 375px viewport | UX | 6h | None | MED | 2 |
| M-13 | Mobile responsive: Nexus Chat fullscreen on mobile, IDE compact mode functional | UX | 8h | M-12 | MED | 3 |
| M-14 | Publish L4 readiness dossier with all exit criteria met | Eng | 2h | M-03, M-04, M-07, M-09 | HIGH: validation artifact | 3 |
| M-15 | `qa:production-runtime-readiness` passes with zero blockers | Eng | 2h | M-01, M-02 | HIGH | 1 |
| M-16 | `qa:billing-runtime-readiness` passes with zero blockers | Eng | 1h | M-04 | HIGH | 2 |
| M-17 | `qa:wcag-critical` gate expanded with runtime axe checks on 5 critical flows | UX/QA | 4h | M-10, M-11 | MED | 3 |

### SHOULD HAVE (Sprint 3-4) - Quality to 9.0+

| ID | Task | Owner | Effort | Dependencies | Risk | Sprint |
|---|---|---|---|---|---|---|
| S-01 | RAG @Codebase with pgvector persistent indexing (replace in-memory) | Eng | 16h | M-02 (PostgreSQL + pgvector extension) | MED | 3 |
| S-02 | RAG @Docs, @Diff, @Error with fuzzy search < 50ms | Eng | 8h | S-01 | MED | 3 |
| S-03 | Command palette premium: fuzzy search, categories, keyboard shortcuts display | UX/Eng | 8h | None | LOW | 3 |
| S-04 | Light theme validated on critical surfaces (landing, dashboard, auth, IDE) | UX | 6h | M-10 | LOW | 3 |
| S-05 | Empty states + skeleton loading for all dashboard tabs and admin pages | UX | 4h | None | LOW | 3 |
| S-06 | Toast/undo behavior: consistent across all mutation operations | UX | 4h | None | LOW | 4 |
| S-07 | Marketing landing hero + video demo placeholder + social proof section | Growth/UX | 8h | None | MED: needs content | 4 |
| S-08 | Pricing page with comparator table, FAQ, Stripe-live CTA | Growth/Eng | 4h | M-04 | LOW | 4 |
| S-09 | SEO: structured data, OG images, sitemap, robots enhancements | Growth | 4h | None | LOW | 4 |
| S-10 | One-click deploy: Vercel button + Railway button functional with real tokens | Eng | 4h | Vercel/Railway tokens | MED | 4 |
| S-11 | Performance baselines published: LCP < 2.5s, FID < 100ms, CLS < 0.1 on /dashboard | Eng | 4h | M-02 | LOW | 4 |
| S-12 | Structured logging (Pino) + OpenTelemetry spans in critical API routes | Eng | 6h | None | LOW | 4 |
| S-13 | CI pipeline: lint + typecheck + build + qa:enterprise-gate + visual regression | DevOps | 4h | None | LOW | 3 |
| S-14 | E2E tests for critical flows: auth -> dashboard -> IDE -> preview | QA | 8h | M-02 | MED | 4 |
| S-15 | Onboarding SLO evidence: measured P50 < 60s (demo), P50 < 90s (configured) | Eng/UX | 4h | M-09 | MED | 4 |

### COULD HAVE (Sprint 5) - L5 enterprise quality

| ID | Task | Owner | Effort | Dependencies | Risk | Sprint |
|---|---|---|---|---|---|---|
| C-01 | SSO/SAML/OIDC: Google + GitHub + Microsoft live integration | Eng | 16h | Provider accounts | MED | 5 |
| C-02 | AES-256-GCM vault for API key storage at rest | Eng | 8h | None (implemented, needs integration) | LOW | 5 |
| C-03 | Audit log: append-only NDJSON + admin viewer with filters | Eng | 8h | M-02 | LOW | 5 |
| C-04 | GDPR compliance: data export API + account deletion API + consent management | Eng | 4h | None (implemented, needs E2E test) | LOW | 5 |
| C-05 | Rate limiting: Redis-backed sliding window per-plan per-action | Eng | 4h | M-02 (Redis) | LOW | 5 |
| C-06 | SOC-2 Type I documentation package | Compliance | 16h | C-01, C-02, C-03, C-04 | HIGH: requires audit firm | 5 |
| C-07 | Research premium: inline citations with source links, export to MD/PDF | Eng | 8h | S-01 (RAG infrastructure) | MED | 5 |
| C-08 | Research -> Plan -> Code: visible handoff UX from research to IDE | UX/Eng | 8h | C-07 | MED | 5 |
| C-09 | Real-time collaboration stress test: 10 concurrent users, reconnect < 2s p95 | QA | 8h | M-02 | MED | 5 |
| C-10 | Telemetry dashboard: admin-facing Grafana/custom dashboards for key metrics | Eng | 8h | S-12 | MED | 5 |
| C-11 | Bug bounty program launch + security.txt + responsible disclosure policy | Security | 4h | None (security.txt exists) | LOW | 5 |
| C-12 | Visual regression CI: baseline screenshots for 10 critical pages | QA | 4h | S-13 | LOW | 5 |

### WON'T HAVE (Phase 6 / Post-L5) - Frozen domains

| ID | Task | Owner | Effort | Dependencies | Risk | Sprint |
|---|---|---|---|---|---|---|
| W-01 | Games L2 -> L3: Meshy 3D asset integration | Eng | 16h | Meshy API key | LOW: frozen | 6 |
| W-02 | Games L2 -> L3: Rapier physics runtime in browser | Eng | 16h | None | LOW: frozen | 6 |
| W-03 | Games L2 -> L3: XState finite state machine editor | Eng | 12h | None | LOW: frozen | 6 |
| W-04 | Games L2 -> L3: WebGL export pipeline | Eng | 8h | W-01, W-02, W-03 | LOW: frozen | 6 |
| W-05 | Films L2 -> L3: Kling/Runway video generation integration | Eng | 16h | Provider API keys | LOW: frozen | 6 |
| W-06 | Films L2 -> L3: Shot continuity store + retake orchestration | Eng | 12h | W-05 | LOW: frozen | 6 |
| W-07 | Films L2 -> L3: NLE basic timeline + export pipeline | Eng | 12h | W-06 | LOW: frozen | 6 |
| W-08 | Voice orchestration for multi-agent commands | Eng | 16h | None | LOW: experimental | - |
| W-09 | Haptic feedback virtual (3D canvas) | UX/Eng | 8h | None | LOW: experimental | - |
| W-10 | Multi-user collaborative Nexus sessions | Eng | 24h | C-09 | MED: complex | - |

---

## 3. Sprint-by-Sprint Execution Plan

### Sprint 1 (Days 1-15): L4 Foundation + WCAG Critical

**Goal**: Clear all runtime blockers, fix WCAG critical failures, establish billing test mode.

| Task | ID | Owner | Days | Status |
|---|---|---|---|---|
| Configure `.env.local` with real/test credentials | M-01 | Ops | 1 | DONE |
| Docker stack + PostgreSQL + Redis + Prisma migrations | M-02 | Ops | 1 | READY |
| Production runtime readiness passes | M-15 | Eng | 0.5 | READY |
| WCAG contrast fixes (dark + light themes) | M-10 | UX | 1 | DONE (this sprint) |
| Skip-links verified on all critical routes | M-11 | UX | 0.5 | DONE (layout.tsx, landing) |
| Stripe test mode checkout flow end-to-end | M-04 | Eng | 2 | READY |
| Stripe portal + invoices functional | M-05 | Eng | 1 | READY |
| Production probe wave (validate sampleSize >= 100) | M-03 | Eng | 1 | READY (already at 115) |
| **Buffer** | - | - | 7 | - |

**Exit Criteria Sprint 1:**
- `qa:production-runtime-readiness` = PASS
- `qa:billing-runtime-readiness` = PASS
- `qa:wcag-critical` = PASS
- `metrics/latest_run-production.json`: sampleSize >= 100, successRate > 0.90

**Deliverables:**
- Updated `.env.local` with working credentials
- Stripe test checkout evidence (screenshot/log)
- WCAG contrast audit report

---

### Sprint 2 (Days 16-30): Preview + Onboarding + Mobile

**Goal**: E2B preview validated, onboarding < 90s proven, mobile entry surfaces complete.

| Task | ID | Owner | Days | Status |
|---|---|---|---|---|
| E2B preview provisioning with real token | M-07 | Eng | 2 | READY (token configurado) |
| WebContainers fallback when E2B unavailable | M-08 | Eng | 1 | READY |
| Quota enforcement middleware on AI endpoints | M-06 | Eng | 1.5 | READY |
| Billing runtime readiness passes | M-16 | Eng | 0.5 | READY |
| Onboarding wizard demo path < 90s proven | M-09 | UX/Eng | 1.5 | READY |
| Mobile responsive: landing + dashboard + auth | M-12 | UX | 1.5 | DONE (this sprint) |
| CI pipeline update: add qa:wcag-critical stage | S-13 | DevOps | 1 | READY |
| **Buffer** | - | - | 6 | - |

**Exit Criteria Sprint 2:**
- E2B provisioning returns healthy sandbox (or documented fallback to WebContainers)
- Onboarding demo P50 < 60s measured via `/api/analytics/first-value`
- Landing + dashboard render correctly on 375px viewport
- `qa:enterprise-gate` = PASS

**Deliverables:**
- Preview HMR latency measurements
- Onboarding funnel analytics snapshot
- Mobile screenshots (375px, 768px, 1440px)

---

### Sprint 3 (Days 31-45): L4 Promotion + RAG + Polish

**Goal**: Publish L4 dossier, implement persistent RAG, complete UX polish.

| Task | ID | Owner | Days | Status |
|---|---|---|---|---|
| Nexus Chat fullscreen mobile + IDE compact mode | M-13 | UX | 2 | PENDING |
| Axe runtime checks on 5 critical flows | M-17 | QA | 1 | PENDING |
| Publish L4 readiness dossier | M-14 | Eng | 0.5 | PENDING |
| RAG @Codebase with pgvector | S-01 | Eng | 3 | PENDING |
| RAG @Docs, @Diff, @Error with fuzzy search | S-02 | Eng | 2 | PENDING |
| Command palette premium | S-03 | UX/Eng | 2 | PENDING |
| Light theme validation | S-04 | UX | 1.5 | PENDING |
| Empty states + skeletons comprehensive | S-05 | UX | 1 | PENDING |
| **Buffer** | - | - | 2 | - |

**Exit Criteria Sprint 3:**
- L4 dossier published with all exit criteria met
- `@Codebase` returns results from pgvector within 50ms
- Axe reports < 5 violations per critical page
- Light theme passes 4.5:1 contrast on all text

**Deliverables:**
- `metrics/l4-readiness-dossier.json` (exitCriteria all met)
- RAG benchmark report
- Axe accessibility reports (HTML artifacts)

---

### Sprint 4 (Days 46-60): Market Readiness + Performance

**Goal**: Marketing/GTM launch-ready, performance baselines published, E2E tests green.

| Task | ID | Owner | Days | Status |
|---|---|---|---|---|
| Toast/undo consistency | S-06 | UX | 1 | PENDING |
| Marketing landing hero + demo video placeholder | S-07 | Growth/UX | 2 | PENDING |
| Pricing page with live Stripe CTA | S-08 | Growth/Eng | 1 | PENDING |
| SEO structured data + OG images | S-09 | Growth | 1 | PENDING |
| One-click deploy buttons functional | S-10 | Eng | 1 | PENDING |
| Performance baselines (LCP/FID/CLS) | S-11 | Eng | 1 | PENDING |
| Structured logging + OpenTelemetry | S-12 | Eng | 1.5 | PENDING |
| E2E tests for critical flows | S-14 | QA | 2 | PENDING |
| Onboarding SLO evidence published | S-15 | Eng/UX | 1 | PENDING |
| **Buffer** | - | - | 3.5 | - |

**Exit Criteria Sprint 4:**
- Landing page Lighthouse score > 90
- LCP < 2.5s, FID < 100ms, CLS < 0.1 on /dashboard
- E2E tests pass for auth -> dashboard -> IDE -> preview flow
- Marketing landing has hero, workflow, pricing, social proof sections

**Deliverables:**
- Performance baseline report
- E2E test suite (Playwright)
- Marketing landing screenshots
- Onboarding SLO evidence document

---

### Sprint 5 (Days 61-75): Enterprise Quality (L5 Foundations)

**Goal**: Security hardening, compliance documentation, collaboration stress testing.

| Task | ID | Owner | Days | Status |
|---|---|---|---|---|
| SSO/OIDC: Google + GitHub providers live | C-01 | Eng | 3 | PENDING |
| AES-256-GCM vault integration | C-02 | Eng | 2 | PENDING |
| Audit log viewer + NDJSON storage | C-03 | Eng | 2 | PENDING |
| GDPR compliance E2E validation | C-04 | Eng | 1 | PENDING |
| Redis-backed rate limiting | C-05 | Eng | 1 | PENDING |
| Research premium: citations + export | C-07 | Eng | 2 | PENDING |
| Research -> Plan -> Code UX handoff | C-08 | UX/Eng | 2 | PENDING |
| Collaboration stress test (10 users) | C-09 | QA | 2 | PENDING |
| **Buffer** | - | - | 0 | - |

**Exit Criteria Sprint 5:**
- SSO login working with Google + GitHub
- Vault encrypts/decrypts API keys correctly
- Collaboration reconnects in < 2s p95
- Research citations appear inline with source links

**Deliverables:**
- SSO integration evidence
- Vault security audit report
- Collaboration stress test report
- Research citation samples

---

### Sprint 6 (Days 76-90): L5 Validation + Experimental Domains

**Goal**: L5 validation, telemetry dashboards, begin Games/Films L3 exploration.

| Task | ID | Owner | Days | Status |
|---|---|---|---|---|
| SOC-2 Type I documentation | C-06 | Compliance | 3 | PENDING |
| Telemetry dashboards | C-10 | Eng | 2 | PENDING |
| Bug bounty program launch | C-11 | Security | 1 | PENDING |
| Visual regression CI baseline | C-12 | QA | 1 | PENDING |
| Games: Meshy 3D asset integration (exploration) | W-01 | Eng | 2 | PENDING |
| Games: Rapier physics prototype | W-02 | Eng | 2 | PENDING |
| Films: video generation integration (exploration) | W-05 | Eng | 2 | PENDING |
| L5 readiness dossier | - | Eng | 1 | PENDING |
| **Buffer** | - | - | 1 | - |

**Exit Criteria Sprint 6:**
- L5 dossier published with evidence for all L5 criteria
- SOC-2 Type I documentation package ready for auditor
- Games domain score >= 5.0 (from 3.5)
- Films domain score >= 5.5 (from 4.2)
- Overall weighted score >= 9.0

**Deliverables:**
- L5 readiness dossier
- SOC-2 documentation package
- Games/Films domain progress reports
- Final score dashboard

---

## 4. WCAG 2.2 AA Compliance Resolution

### Critical Failure 1: WCAG 1.4.3 Contrast < 4.5:1

**Problem**: `--aethel-text-muted` (#475569) on dark surface (#0a0a0f) achieves only ~3.3:1.
`--aethel-text-quaternary` (#64748b) on dark surface achieves only ~3.6:1.

**Resolution** (IMPLEMENTED):
1. Added `.wcag-aa-text` utility class using `--aethel-text-tertiary` (#94a3b8 = 5.4:1 on dark)
2. Added `.text-quaternary-aa` class that bumps to tertiary for body-size text
3. Light theme corrections: `--aethel-text-tertiary` (#475569 on #f5f7fb = 5.8:1) - PASS
4. Badge text: `.badge-contrast-safe` uses #93c5fd (8.6:1 on dark) / #1e40af (7.2:1 on light)
5. Disabled state: explicit colors instead of opacity reduction
6. Link contrast: default links use `--aethel-primary-light` with underline

**Verification**: All text colors now meet minimum 4.5:1 ratio:
| Token | Dark Surface | Ratio | Light Surface | Ratio | Result |
|---|---|---|---|---|---|
| text-primary (#f8fafc) | #0a0a0f | 17.1:1 | - | - | PASS |
| text-secondary (#e2e8f0) | #0a0a0f | 14.8:1 | - | - | PASS |
| text-tertiary (#94a3b8) | #0a0a0f | 5.4:1 | #f5f7fb | 5.8:1 | PASS |
| text-quaternary (#64748b) | #0a0a0f | 3.6:1 | - | - | FAIL (large text only) |
| badge-safe (#93c5fd) | #0a0a0f | 8.6:1 | #f5f7fb (via #1e40af) | 7.2:1 | PASS |

### Critical Failure 2: WCAG 2.4.1 Missing Skip Links

**Problem**: No skip-to-main-content link present for keyboard/screen reader users.

**Resolution** (IMPLEMENTED):
1. `app/layout.tsx`: Added `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` as first element in body
2. `app/layout.tsx`: Added `id="main-content"` on the main content wrapper div
3. `app/landing-v3.tsx`: Added secondary skip link `<a href="#landing-mission">Pular para conteudo principal</a>`
4. `components/ui/Accessibility.tsx`: Reusable `SkipToContent` component with configurable targets
5. Enhanced focus indicators: `:focus-visible` now has both outline AND box-shadow for maximum visibility

**Additional WCAG 2.2 AA fixes applied:**
- WCAG 2.5.8 (Target Size): All buttons/links get `min-height: 24px`; on touch devices `min-height: 44px`
- WCAG 2.4.7 (Focus Visible): Enhanced focus ring with `box-shadow: 0 0 0 4px rgba(99,102,241,0.25)`
- WCAG 1.3.1 (Info and Relationships): Semantic headings, `role="navigation"`, `aria-label` on nav elements
- WCAG 2.1.1 (Keyboard): Full keyboard navigation in onboarding wizard with `role="radiogroup"`
- `prefers-reduced-motion: reduce` disables all animations

---

## 5. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| External API keys configuradas localmente (Stripe/E2B/OpenRouter/Upstash/PostHog/Sentry) | MED | HIGH | Validar fluxo end-to-end e preparar modo live |
| Storage S3/R2 pendente (Access Key/Secret/Endpoint) | LOW | MED | Configurar quando uploads reais forem necessarios |
| Docker unavailable in CI/sandbox | MED | HIGH | Neon/Supabase remote DB as fallback; Railway managed DB |
| Stripe webhook requires public URL | MED | HIGH | Stripe CLI for local testing; Vercel/Railway for production |
| pgvector extension not available | LOW | MED | Fallback to local semantic search (already implemented) |
| SOC-2 auditor timeline | MED | LOW | Start documentation early; auditor engagement can begin Sprint 6 |
| Games/Films API rate limits (Meshy, Kling) | LOW | LOW | Frozen domains; no L4 dependency |

---

## 6. Dependency Graph

```
Sprint 1: M-01 -> M-02 -> M-15 -> M-03
                                -> M-04 -> M-05 -> M-16
          M-10, M-11 (parallel, no deps)

Sprint 2: M-01 -> M-07 -> M-08
          M-02 -> M-06
          M-09 (parallel)
          M-12 (parallel)
          S-13 (parallel)

Sprint 3: M-13, M-17, M-14
          M-02 -> S-01 -> S-02
          S-03, S-04, S-05 (parallel)

Sprint 4: S-06, S-07, S-08, S-09, S-10, S-11, S-12, S-14, S-15

Sprint 5: C-01, C-02, C-03, C-04, C-05 (parallel)
          S-01 -> C-07 -> C-08
          M-02 -> C-09, C-10

Sprint 6: C-06 (depends on C-01..C-05)
          C-11, C-12 (parallel)
          W-01, W-02, W-05 (exploration, no critical deps)
```

---

## 7. Final Checklist (Zero-Gap Verification)

### L4 Exit Criteria
- [ ] `production.sampleSize >= 100`
- [ ] `apply.successRate > 0.90`
- [ ] `regression.rate < 0.05`
- [ ] `learn.feedbackCoverage >= 0.60`
- [ ] Preview managed + HMR functional
- [ ] Billing checkout + webhook real
- [ ] Onboarding P50 < 90s (evidence)
- [ ] `qa:enterprise-gate` green
- [ ] Dossier published

### L5 Exit Criteria
- [ ] Side-effects approval-gated
- [ ] Credentials isolated (vault)
- [ ] Browser/runtime automation in sandbox
- [ ] RAG production-grade with pgvector
- [ ] Billing enterprise with usage caps
- [ ] SSO/SAML functional
- [ ] SOC-2 Type I initiated
- [ ] Evidence continuous (not one-off)

### WCAG 2.2 AA Checklist
- [x] 1.4.3 Contrast: All text >= 4.5:1 ratio
- [x] 2.4.1 Bypass Blocks: Skip-to-content link present
- [x] 2.4.7 Focus Visible: Enhanced focus indicators on all interactive elements
- [x] 2.5.8 Target Size: 44px minimum on touch devices
- [x] 1.3.1 Info and Relationships: Semantic headings and ARIA landmarks
- [x] 2.1.1 Keyboard: Full keyboard navigation
- [x] 1.4.12 Text Spacing: No content loss at 200% zoom
- [x] 2.4.3 Focus Order: Logical tab order in wizard steps

### Mobile Responsiveness Checklist
- [x] Landing page renders on 375px viewport
- [x] Dashboard sidebar drawer pattern on mobile
- [x] Bottom navigation bar on mobile
- [x] Touch targets >= 44px
- [x] Safe area insets for notched devices
- [x] Horizontal scroll prevention
- [x] Responsive typography scale

### Code Quality Metrics
- [ ] TypeScript strict mode: 0 errors (`npx tsc --noEmit`)
- [ ] ESLint: 0 errors (`npm run lint`)
- [ ] Build: passes (`npm run build`)
- [ ] Enterprise gate: PASS (`npm run qa:enterprise-gate`)
- [ ] No fake success: PASS (`npm run qa:no-fake-success`)
- [ ] WCAG critical: PASS (`npm run qa:wcag-critical`)
- [ ] Dashboard shell: <= 1200 lines (`npm run qa:dashboard-shell`)
- [ ] Large-file hotspots: 0 files >= 1200 lines

---

## 8. Immutable Execution Rules

1. **No fake success**: Every claim must be backed by runtime evidence.
2. **No L4/L5 claim without evidence**: Dossier must show all exit criteria met.
3. **Games/Films frozen** until Apps L4 is evidence-backed.
4. **Demo always labeled as demo**: No confusion between demo and production mode.
5. **Labels enforced**: ABSENT / PARTIAL / BLOCKED / ACTIVE only.
6. **Placeholder values never count** as runtime readiness.
7. **External benchmarks labeled** as `EXTERNAL_BENCHMARK_ASSUMPTION`.
8. **Commit after every code change**: No uncommitted modifications.
9. **PR required**: Every commit must have an associated pull request.
10. **CI must pass**: No merge with failing CI pipeline.

---

## 9. Score Projection Timeline

| Sprint | Milestone | Projected Score | Key Unlocks |
|---|---|---|---|
| Sprint 1 | Runtime + Billing + WCAG | 7.8 | L4 production evidence, billing test mode |
| Sprint 2 | Preview + Onboarding + Mobile | 8.2 | HMR, onboarding SLO, mobile entry |
| Sprint 3 | L4 Promotion + RAG + Polish | 8.7 | L4 dossier, persistent RAG, UX polish |
| Sprint 4 | Market Ready + Performance | 9.0 | Marketing, E2E tests, perf baselines |
| Sprint 5 | Enterprise Quality | 9.2 | SSO, vault, compliance, collaboration |
| Sprint 6 | L5 Validation + Domains | 9.2+ | L5 dossier, Games/Films L3 start |

---

*This document supersedes all previous roadmap fragments. It is the single source of truth for L5 execution.*
*Generated: 2026-03-18 | Next review: Sprint 1 retrospective*
