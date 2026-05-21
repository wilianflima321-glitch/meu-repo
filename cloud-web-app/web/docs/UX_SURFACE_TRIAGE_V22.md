# UX_SURFACE_TRIAGE_V22.md

Generated: deterministic local triage on 2026-05-21

Base commit: `abfc5b445 chore: harden trust and runtime evidence gates`

Current execution note: V22.1/V22.2 has since implemented the authenticated UX harness, dashboard topbar compression, global admin compatibility drawer, shared Browser/Studio Local/Cloud Stream runtime model, protected `/evidence`, marketplace install review, pricing disclosure compression, enterprise-aware auth provider breadth, and Studio maturity headers. This document remains the triage baseline; the P0 status table below tracks what has moved from finding to implemented gate.

This audit is intentionally evidence-first. It does not claim that Aethel is already best-in-market on every surface. It identifies where the current product is strong, where it is noisy, where compatibility debt leaks into the user experience, and which fixes should happen before new feature expansion.

## Evidence Inputs

- Local app: `http://localhost:3000`
- Screenshot index: `output/playwright/v22-ux-triage/screenshot-index.json`
- Screenshot folder: `output/playwright/v22-ux-triage/`
- Screenshot artifacts are local and reproducible; `cloud-web-app/web/output/` is intentionally not versioned.
- Desktop viewport: `1440x1000`
- Mobile viewport: `390x844`
- Supporting audits:
  - `docs/BUNDLE_BOUNDARIES_AUDIT.md`
  - `docs/LARGE_FILE_RISK_AUDIT.md`
  - `docs/WCAG_CRITICAL_SURFACE_AUDIT.md`
  - `docs/ROUTES_INVENTORY.md`
  - `docs/AI_DIRECTOR_REAL_AUDIT.md`
  - `docs/SUSPENSE_BOUNDARIES_AUDIT.md`
  - `docs/EFFECT_CLEANUP_AUDIT.md`
  - `docs/EDITOR_PERFORMANCE_RISK_AUDIT.md`

## Market References Consulted

- [Cursor Background Agents](https://docs.cursor.com/background-agents)
- [Replit 2025 review](https://replit.com/blog/2025-replit-in-review)
- [Linear homepage](https://linear.app/homepage)
- [Vercel v0 app builder](https://vercel.com/blog/v0-app)
- [v0 Platform API](https://v0.dev/docs/api/platform/overview)
- [Unreal Engine 5.6](https://www.unrealengine.com/news/unreal-engine-5-6-is-now-available)
- [Adobe Premiere Generative Extend](https://www.adobe.com/learn/premiere-pro/web/add-frames-generative-extend)
- [Adobe Premiere Object Mask](https://www.adobe.com/learn/premiere-pro/web/remove-background-object-mask)
- [Runway Gen-4 Video](https://help.runwayml.com/hc/en-us/articles/37327109429011-Creating-with-Gen-4-Video)
- [Canva Magic Studio](https://www.canva.com/newsroom/news/magic-studio/)

## Executive Read

Aethel is now meaningfully stronger than the V19/V20 baseline on honesty, auth modernization, runtime visibility, cost visibility, and agent evidence. The main blocker is no longer "missing features everywhere"; it is product shape.

The surfaces still feel like an advanced internal cockpit exposed too early in several places. Best-in-market products hide complexity until the user asks for it. Aethel often explains its operating model in too many cards before the user has felt one crisp win.

Top decisions:

1. Keep the evidence-first positioning, but reduce public-page card density by 25-40%.
2. Treat authenticated screenshot coverage as a P0: current Playwright evidence for dashboard, IDE, Studio, admin, billing, and settings only validates the auth gate.
3. Hide or route the admin legacy map behind an "Operational compatibility" drawer/command palette, not the default admin navigation.
4. Remove or relabel hardcoded marketplace installs/ratings until they are backed by real telemetry.
5. Consolidate dashboard navigation: one primary sidebar, one command palette, one contextual rail only when it has active work.
6. Keep "browser-to-local-to-cloud" as the differentiator, but never imply Unreal/Adobe/Figma parity without runtime evidence.

## Surface Score Matrix

Scale: 0-10. `decision` is the next product-management action, not a deletion command.

| Surface | Evidence | Clarity | Craft | Speed | Trust | Focus | A11y | Market parity | Differentiation | Score | Decision |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` Landing | screenshots + code | 8.0 | 8.0 | 7.0 | 8.5 | 7.0 | 8.0 | 7.5 | 8.5 | 7.8 | refine |
| `/login` | screenshots + code | 8.5 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 7.0 | 7.0 | 7.8 | refine |
| `/register` | screenshots + code | 7.8 | 7.8 | 8.0 | 7.8 | 7.5 | 8.0 | 6.8 | 6.8 | 7.4 | refine |
| `/pricing` | screenshots + code | 7.0 | 7.5 | 6.5 | 7.0 | 5.5 | 7.5 | 7.0 | 6.5 | 6.8 | rebuild upper flow |
| `/download` | screenshots + code | 8.0 | 8.0 | 7.0 | 9.0 | 7.0 | 8.0 | 7.0 | 8.5 | 7.8 | keep/refine |
| `/marketplace` | screenshots + code | 7.5 | 8.0 | 5.5 | 6.0 | 7.0 | 8.0 | 7.5 | 8.0 | 7.2 | refine |
| `/dashboard` | auth-gate screenshot + code | 6.5 | 7.0 | 7.0 | 7.0 | 5.5 | 7.5 | 6.5 | 7.0 | 6.8 | merge/refine |
| `/ide` | auth-gate screenshot + code | 7.5 | 8.0 | 6.5 | 8.0 | 7.0 | 7.5 | 8.0 | 8.5 | 7.6 | refine |
| `/studio` hub | auth-gate screenshot + code | 7.5 | 7.5 | 6.5 | 8.0 | 6.5 | 7.5 | 7.0 | 8.5 | 7.4 | refine |
| Studio editor routes | auth-gate screenshot + code | 6.5 | 7.0 | 5.5 | 7.0 | 6.0 | 7.0 | 6.5 | 8.0 | 6.7 | adapter-needed |
| `/admin` | auth-gate screenshot + code | 6.5 | 7.0 | 6.5 | 7.5 | 5.5 | 8.0 | 6.5 | 7.0 | 6.8 | hide/merge legacy |
| `/billing` | auth-gate screenshot + code | 7.0 | 7.0 | 7.0 | 7.5 | 6.5 | 7.5 | 7.0 | 6.5 | 7.0 | refine |
| `/settings` | auth-gate screenshot + code | 7.0 | 7.0 | 7.0 | 7.0 | 6.5 | 7.5 | 7.0 | 6.5 | 6.9 | refine |
| Docs/trust routes | route inventory + code | 7.0 | 7.0 | 7.0 | 8.0 | 6.5 | 7.5 | 7.0 | 7.0 | 7.1 | refine |
| Mobile/PWA | mobile screenshots + manifest/SW evidence | 7.0 | 7.5 | 6.0 | 7.5 | 6.0 | 7.0 | 6.5 | 7.0 | 6.8 | refine |

## Screenshot Evidence

| Route | Desktop | Mobile | Runtime note |
| --- | --- | --- | --- |
| `/` | `output/playwright/v22-ux-triage/desktop-home.png` | `output/playwright/v22-ux-triage/mobile-home.png` | Public page rendered. |
| `/login` | `output/playwright/v22-ux-triage/desktop-login.png` | `output/playwright/v22-ux-triage/mobile-login.png` | Public auth page rendered. |
| `/register` | `output/playwright/v22-ux-triage/desktop-register.png` | `output/playwright/v22-ux-triage/mobile-register.png` | Public auth page rendered. |
| `/pricing` | `output/playwright/v22-ux-triage/desktop-pricing.png` | `output/playwright/v22-ux-triage/mobile-pricing.png` | Public page rendered. |
| `/download` | `output/playwright/v22-ux-triage/desktop-download.png` | `output/playwright/v22-ux-triage/mobile-download.png` | Public page rendered. |
| `/marketplace` | `output/playwright/v22-ux-triage/desktop-marketplace.png` | `output/playwright/v22-ux-triage/mobile-marketplace.png` | Public page rendered. |
| `/dashboard` | `output/playwright/v22-ux-triage/desktop-dashboard.png` | `output/playwright/v22-ux-triage/mobile-dashboard.png` | Redirected to sign-in state; code audit used for product surface. |
| `/ide` | `output/playwright/v22-ux-triage/desktop-ide.png` | `output/playwright/v22-ux-triage/mobile-ide.png` | Redirected to sign-in state; code audit used for product surface. |
| `/studio` | `output/playwright/v22-ux-triage/desktop-studio.png` | `output/playwright/v22-ux-triage/mobile-studio.png` | Redirected to sign-in state; code audit used for product surface. |
| `/studio/level` | `output/playwright/v22-ux-triage/desktop-studio__level.png` | `output/playwright/v22-ux-triage/mobile-studio__level.png` | Redirected to sign-in state; code audit used for editor surface. |
| `/studio/scene` | `output/playwright/v22-ux-triage/desktop-studio__scene.png` | `output/playwright/v22-ux-triage/mobile-studio__scene.png` | Redirected to sign-in state; code audit used for editor surface. |
| `/studio/film` | `output/playwright/v22-ux-triage/desktop-studio__film.png` | `output/playwright/v22-ux-triage/mobile-studio__film.png` | Redirected to sign-in state; code audit used for editor surface. |
| `/admin` | `output/playwright/v22-ux-triage/desktop-admin.png` | `output/playwright/v22-ux-triage/mobile-admin.png` | Redirected to sign-in state; code audit used for admin surface. |
| `/settings` | `output/playwright/v22-ux-triage/desktop-settings.png` | `output/playwright/v22-ux-triage/mobile-settings.png` | Redirected to sign-in state; code audit used for settings surface. |
| `/billing` | `output/playwright/v22-ux-triage/desktop-billing.png` | `output/playwright/v22-ux-triage/mobile-billing.png` | Redirected to sign-in state; code audit used for billing surface. |

## Quantitative Local Observations

| Route | Desktop text chars | Desktop card-ish nodes | Desktop height | Mobile height | Cold dev capture |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 3092 | 96 | 2465 | 5879 | 31.2s |
| `/login` | 1012 | 32 | 1000 | 994 | 14.1s |
| `/register` | 818 | 29 | 1000 | 932 | 12.1s |
| `/pricing` | 5164 | 97 | 4120 | 8880 | 20.3s |
| `/download` | 3730 | 64 | 2323 | 5902 | 13.5s |
| `/marketplace` | 2440 | 92 | 2177 | 4615 | 47.6s |

Interpretation: dev-mode compile times are not production performance numbers, but they reveal route complexity and first-hit developer ergonomics. Text/card counts are enough to flag density risk on pricing, marketplace, landing, and download.

## Surface Triage

### 1. Landing `/`

Verdict: strong direction, slightly over-explained.

Strengths:

- Mission-first hero is much better than generic "AI can do everything" copy.
- Evidence-first positioning is differentiated against v0/Replit prompt-first flows.
- Runtime depth framing is honest and avoids Unreal-grade overclaiming.

Gaps:

- The right proof rail plus mode cards makes the first screen feel like a product briefing, not a single decisive entry.
- Mobile page is almost 7 viewports tall before footer. The "proof" section is valuable, but too much appears before one clear conversion loop.
- The hero still has two primary-ish CTAs plus prompt chips plus mode cards.

Market comparison:

- v0 and Replit optimize for one prompt and one next action.
- Linear optimizes for quiet hierarchy and confidence, not dense proof panels.
- Aethel should keep evidence, but move secondary proof after the first successful mission input.

Decision: `refine`

Next action:

- Convert above-the-fold to one dominant mission input, one primary CTA, one secondary "readiness" link.
- Move "Product proof" cards below the first scroll or behind "Why trust this run?"
- Reduce start modes from 6 always-visible cards to 3 primary modes plus compact "More".

### 2. Login/Register

Verdict: professionally improved; needs enterprise parity and less internal jargon.

Strengths:

- Passkey-first flow is a major product-quality upgrade.
- Magic link and password fallback are visible without taking over the page.
- The layout feels calmer than prior audit notes.

Gaps:

- OAuth is GitHub/Google only. Enterprise buyers expect Microsoft, Apple, and SSO/SAML entry points, even if SSO is gated by plan.
- Side-panel stats use internal language (`20+ agents gated`, `L4 readiness`) before users know the product model.
- Mobile hides much of the trust explanation; this is acceptable, but the remaining copy should be less jargon-heavy.

Market comparison:

- Vercel/Linear-style auth surfaces expose SSO clearly for team buyers.
- Aethel's passkey-first ordering is competitive; provider breadth is the gap.

Decision: `refine`

Next action:

- Add Microsoft/Apple/SSO buttons as capability-aware entries.
- Replace `L4 readiness` with user-language such as `Evidence-ready` or `Team governance`.

### 3. Pricing

Verdict: transparent, but visually too heavy.

Strengths:

- Real BRL pricing and token/project/storage details are useful.
- Enterprise section explains why sales exists.
- "Real billing readiness" avoids fake checkout confidence.

Gaps:

- Five plan cards plus enterprise plus comparison plus readiness plus FAQ creates a long pricing wall.
- Mobile height is 8880px. That is too long before a buyer can compare simply.
- "Apps + Research are the current focus" is honest but should be a compact readiness badge, not a hero caveat.

Market comparison:

- Linear/Vercel pricing pages are scannable first, detailed second.
- Aethel currently asks users to understand too much billing logic before choosing.

Decision: `rebuild upper flow`

Next action:

- Default to 3 visible plans: Free, Pro, Studio. Collapse Starter/Basic into "See all plans" or a comparison table.
- Keep detailed token/storage matrix below.
- Add a simple "Which plan fits me?" selector with 3 workflows.

### 4. Download / Studio Local

Verdict: one of the strongest surfaces because it is honest.

Strengths:

- Readiness/capability posture prevents fake installer confidence.
- The page explains browser/local/cloud split without promising magic.
- Good fit with V20/V21 trust-layer strategy.

Gaps:

- Still has a lot of explanatory card copy.
- Needs clearer "what can I do today?" versus "what is beta/held/planned?"
- Needs install artifact evidence once release pipeline is real.

Market comparison:

- Cursor/Linear desktop experiences are direct downloads; Aethel cannot mimic that until installers are signed.
- The honest beta posture is correct and should remain.

Decision: `keep/refine`

Next action:

- Add a compact release readiness table at top: Windows, macOS, Linux, updater, signing, sidecars.
- Keep "Request desktop beta" as the CTA if signed installers are not ready.

### 5. Marketplace

Verdict: conceptually strong, trust-data risk.

Strengths:

- Permissions, provenance, risk, and rollback are the right marketplace grammar.
- The "review install" action is safer than one-click install.
- Differentiates from generic plugin stores.

Gaps:

- `app/marketplace/marketplace-page.data.ts` contains hardcoded ratings/download counts such as `18400`, `12200`, `9800`, and `7600`. Unless these are real telemetry, this creates trust risk.
- Marketplace load was the slowest public route in dev capture.
- Four cards leave awkward empty grid space on desktop.

Market comparison:

- Canva/Figma marketplace-style ecosystems earn trust through real community metrics, provenance, and previews.
- Aethel can win on governance, but only if all numbers are real or explicitly marked as sample/internal.

Decision: `refine`

Next action:

- Replace hardcoded installs/ratings with `Internal preview`, `Verified by Aethel`, or real metrics from API.
- Add install-detail modal with permission diff, provenance file, rollback plan, and capability maturity.
- Defer 3D/asset previews behind dynamic boundaries.

### 6. Dashboard

Verdict: functionally rich, navigation still feels over-instrumented.

Evidence:

- `components/dashboard/DashboardShell.tsx` imports `StudioGlobalNav`, `StudioActionRail`, `AethelDashboardSidebar`, and `DashboardFlowRail`.
- Lines around the shell show `TrialBanner`, routing notice, global nav, action rail, flow rail, and sidebar all competing for user attention.

Strengths:

- Cost, agent, routing, and onboarding concepts exist.
- Empty-state system appears standardized.

Gaps:

- Too many navigation systems for one dashboard.
- Best-in-class dashboards usually have one persistent primary nav and contextual controls only when active.
- Billing should stay in `/billing`; dashboard should focus on mission health and project continuity.

Market comparison:

- Linear is the benchmark: one primary hierarchy, command palette, contextual panes.
- Aethel should not show every "spine" concept at once.

Decision: `merge/refine`

Next action:

- Keep one sidebar.
- Move `StudioActionRail` and `DashboardFlowRail` into command palette / "Active work" drawer.
- Make the dashboard home: current mission, active agents, cost posture, project list, next best action.

### 7. IDE

Verdict: differentiated and now credible, but cockpit density must be tamed.

Strengths:

- `CostMeter` is in the workspace.
- Runtime controls and preview readiness are visible.
- `AgentsWindow` can show replay, read receipts, scope, pause/resume, and latest run.
- This is the closest Aethel comes to a Cursor-class differentiator.

Gaps:

- `components/agents/AgentsWindow.tsx` is 499 lines and includes fleet, replay, cost note, read receipts, scope, and empty states in one component. The UX may be technically complete but cognitively heavy.
- Runtime UI still appears as infrastructure. It needs a simple mode switcher: `Browser`, `Local`, `Cloud Stream`, each with status/cost/fallback reason.
- Several IDE strings still mix product language with internal readiness language.

Market comparison:

- Cursor Background Agents are successful because the model is simple: agent status, logs, branch/PR, take over when needed.
- Aethel has more safety evidence than Cursor, but should progressively disclose it.

Decision: `refine`

Next action:

- Split `AgentsWindow` UI into `FleetSummary`, `ReplayPanel`, `GovernanceEvidence`, and `CostSnapshot`.
- Default collapsed evidence sections; show red/yellow blockers first.
- Add a top-level tri-target runtime pill with explicit status.

### 8. Studio Hub and Studio Editors

Verdict: deep capability, weak progression model.

Strengths:

- 19 Studio routes are wired.
- The product has real editor surface area across level, scene, film, audio, animation, terrain, material, VFX, physics, and character workflows.
- Engine spine reports now track held/adapter-needed decisions.

Gaps:

- Studio route count is impressive internally, but can feel like a feature wall externally.
- Editors need maturity badges and "what works today" summaries.
- Large P1 modules are triaged but not yet turned into visible safe adapters.
- Heavy runtime modules must not be imported just to prove they exist.

Market comparison:

- Unreal/Unity/Godot win on mature editing depth.
- Aethel's differentiator is AI workflow orchestration plus browser/local/cloud handoff, not raw editor parity.

Decision: `adapter-needed`

Next action:

- Group Studio into 4 modes: Build, Animate, Simulate, Review.
- Each editor route gets a maturity header: `GA`, `Beta`, `Alpha`, `Held`, with limitations.
- Convert P1 modules into read-only adapters before enabling writes/heavy execution.

### 9. Admin

Verdict: strategically improved, still leaks compatibility debt.

Evidence:

- Route inventory: 46 admin routes.
- Admin shell maps the visible operating model to six areas, but `Legacy map` still appears inside each visible group.
- `app/admin/admin-ops-layout-client.tsx` contains legacy map rendering and 547 lines of shell/UI logic.

Strengths:

- Six-area model (`People`, `Money`, `AI`, `Platform`, `Trust`, `Product`) is the right executive information architecture.
- Legacy route compatibility is correctly preserved.
- Landmarks/focus checks pass static WCAG gate.

Gaps:

- "Legacy map" in the default nav tells operators the product is still a route archive.
- Admin pages still mix English and Portuguese labels (`Planos assets`, `Abertos`, `Aprovadas`, etc.) in legacy routes.
- Some admin pages expose production-ish language without always showing source/evidence state.

Market comparison:

- Linear/Vercel admin-like surfaces hide legacy structure behind search/command palette.
- Operators need current state, owners, incidents, costs, and risk lanes first; compatibility maps second.

Decision: `hide/merge legacy`

Next action:

- Keep legacy URLs, but move legacy map behind command palette or "Compatibility routes" drawer.
- Add owner/evidence/status strip to every consolidated area.
- Create a "route retirement candidates" queue, not visible by default.

### 10. Billing and Settings

Verdict: compatible, needs trust-state consistency.

Strengths:

- Billing readiness and Stripe posture are more honest than fake checkout.
- Settings has provider recovery in WCAG audit.

Gaps:

- Runtime screenshot only reached sign-in, so actual billing/settings states need seeded QA.
- Billing should surface: payment provider configured/not configured, invoice state, plan limits, token/cost consumption, and support path.
- Settings should be less generic and organized by Account, Team, Runtime, AI Providers, Security.

Decision: `refine`

Next action:

- Add seeded visual states.
- Normalize empty/error/loading cards with the same language as admin/IDE.

### 11. Docs, Trust, Compliance, Status

Verdict: governance is strong; user pathway needs simplification.

Strengths:

- Separate trust/status/security/compliance/reliability pages exist.
- Marketing claims and no-fake-success gates are present.

Gaps:

- Users should not need to inspect multiple trust pages to understand product maturity.
- The public footer has many trust links; useful, but could be consolidated through an "Evidence center".

Market comparison:

- Enterprise buyers expect SOC2/security/compliance pages, but with clear current status and downloadable artifacts.

Decision: `refine`

Next action:

- Create one Evidence Center index with security, compliance, uptime, maturity map, and data subprocessors.
- Keep deep routes, but guide from the top.

### 12. Mobile/PWA

Verdict: usable public pages, not yet a premium mobile product.

Strengths:

- Public pages render on mobile.
- Landing mobile hierarchy is readable.

Gaps:

- Pricing mobile is far too long.
- Studio/IDE mobile evidence currently stops at auth gate.
- Monaco/viewport-heavy flows still need mobile-specific fallbacks before claiming broad mobile readiness.

Market comparison:

- Linear mobile is optimized for review and lightweight action, not full editing.
- Aethel should position mobile as companion/review/approve, not full creation until CodeMirror/editor fallbacks are proved.

Decision: `refine`

Next action:

- Define mobile modes: review, approve, pause/takeover, read evidence, billing/cost, download handoff.
- Avoid full 3D/Monaco promise on mobile without fallback proof.

## P0 Backlog

1. Authenticated visual QA harness
   - Problem: protected route screenshots only validate sign-in.
   - Action: add deterministic seeded/session visual QA for dashboard, IDE, Studio, admin, billing, settings.
   - Acceptance: screenshot captures real authenticated states without production secrets.
   - Status: implemented as `qa:authenticated-ux-harness` and `qa:authenticated-ux-capture`; full capture still requires a running app and `JWT_SECRET`.

2. Marketplace metrics honesty
   - Problem: hardcoded installs/ratings look like public traction.
   - Action: replace with real telemetry or explicit `Internal preview` labels.
   - Acceptance: no public marketplace card displays fake download/rating metrics.
   - Status: implemented in marketplace trust cards and guarded by `qa:marketplace-install-review`.

3. Dashboard/admin nav compression
   - Problem: dashboard has multiple nav layers; admin still exposes legacy maps.
   - Action: one primary nav; compatibility maps behind command palette/drawer.
   - Acceptance: default dashboard/admin view has one primary nav and one primary next action.
   - Status: implemented through `DashboardTopBar`, removal of default flow rail render, and global admin compatibility drawer.

4. Pricing density cut
   - Problem: 97 card-ish nodes, 5164 text chars, 8880px mobile height.
   - Action: three visible plans + collapsed advanced matrix.
   - Acceptance: mobile pricing first decision is visible within 2 viewport heights.
   - Status: partially implemented by collapsing comparison and FAQ; full mobile height verification needs fresh visual capture.

5. Runtime mode simplification
   - Problem: runtime controls are technically honest but not yet user-simple.
   - Action: single selector: `Browser`, `Local`, `Cloud Stream`, each with status/cost/fallback reason.
   - Acceptance: user can understand where execution is running in under 5 seconds.
   - Status: implemented with shared `RuntimeModeViewModel` and guarded by `qa:runtime-mode-simplification`.

## P1 Backlog

1. Landing proof progressive disclosure
   - Move product proof cards below mission input or behind "Why trust this run?"

2. Agent cockpit decomposition
   - Split `AgentsWindow` into smaller components and default evidence sections collapsed.

3. Studio maturity badges
   - Add per-editor `GA/Beta/Alpha/Held` + limitations + heavy-runtime load status.

4. Bundle headroom
   - Prioritize dynamic wrappers for `AssetPreviewPanel`, `ContentBrowserConnected`, `ControlRigEditor`, `LevelEditor`, `SceneEditor`, and viewport-heavy panels.

5. Enterprise auth parity
   - Add Microsoft, Apple, and SSO-aware entry paths.

6. Admin copy/i18n cleanup
   - Remove Portuguese labels from legacy admin visible states or route through i18n.

7. Evidence Center
   - Consolidate trust/security/compliance/status entry into one executive-friendly index.

8. Editor performance evidence
   - Add runtime benchmark fixtures for WorldOutliner, EngineContentBrowser, KeyframeSystem, DetailsPanel.

## P2 Backlog

1. Marketplace install detail modal with permission diff and rollback preview.
2. Mobile companion mode for review/approve/cost/replay.
3. Pricing plan recommender based on workflow pressure.
4. Studio route grouping into Build, Animate, Simulate, Review.
5. Public-page visual language refresh to avoid all surfaces feeling like the same dark glass cockpit.
6. Case-study slots with real beta evidence only.

## Keep / Refine / Merge / Hide / Archive Decisions

| Area | Decision | Reason |
| --- | --- | --- |
| Landing | refine | Strong positioning; reduce density. |
| Auth | refine | Passkey-first is strong; add enterprise parity and remove jargon. |
| Pricing | rebuild upper flow | Too many visible plans and too much text before first decision. |
| Download | keep/refine | Honest Studio Local truth layer is a strength. |
| Marketplace | refine | Governance model is right; hardcoded metrics risk trust. |
| Dashboard | merge/refine | Reduce nav layers and focus on mission/current work. |
| IDE | refine | Strong differentiator; simplify cockpit and runtime mode. |
| Studio Hub | refine | Group routes by workflow instead of feature wall. |
| Studio Editors | adapter-needed | Expose hidden engines safely before heavy execution. |
| Admin | hide/merge legacy | Six-area model is right; legacy maps should not be default UX. |
| Billing | refine | Needs seeded states and clearer readiness/cost linkage. |
| Settings | refine | Needs account/team/runtime/security grouping. |
| Docs/Trust | refine | Create one Evidence Center entry. |
| Mobile/PWA | refine | Companion/review mode first; full editor later. |

## Next Commit Recommendation

Suggested next implementation package: `feat: reduce public density and harden marketplace truth`

Scope:

1. Pricing upper-flow simplification.
2. Marketplace metric honesty fix.
3. Landing progressive proof disclosure.
4. Admin legacy map moved behind command palette/drawer.
5. Auth side-panel jargon cleanup.

This package has high user-visible impact, low backend risk, and directly addresses trust/focus gaps found in the triage.

## Validation Notes

- Screenshot capture passed for all planned routes with HTTP 200.
- Protected routes rendered sign-in because no seeded authenticated QA state was configured for this triage.
- No console or request failures were recorded by the screenshot harness.
- Supporting gates should still be run before merging any code changes from the P0/P1 backlog.
