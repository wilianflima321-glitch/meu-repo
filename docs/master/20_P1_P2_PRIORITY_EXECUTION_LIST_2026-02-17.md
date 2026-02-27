# 20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17
Status: DECISION-COMPLETE EXECUTION LIST
Date: 2026-02-17
Source Base: `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`

## 0. Scope
This backlog is limited to P1/P2 hardening on the current product scope:
1. single shell `/ide`
2. explicit capability gates
3. no new product shell
4. no fake success

## 1. P1 Priorities (Execute First)
### P1-01 Workbench Usability Consistency
1. Objective: make primary `/ide` journeys predictable and fast.
2. Files:
- `cloud-web-app/web/app/ide/page.tsx`
- `cloud-web-app/web/components/ide/IDELayout.tsx`
- `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
3. Done criteria:
- no dead-end CTA in critical editor flow
- clear empty/error/loading states in explorer/editor/preview
- keyboard flow remains intact

### P1-02 Editor-Native AI Clarity
1. Objective: keep AI assist in editor as primary, chat as secondary.
2. Files:
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
- `cloud-web-app/web/components/editor/InlineEditModal.tsx`
- `cloud-web-app/web/components/editor/GhostTextDecorations.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
3. Done criteria:
- inline suggestions visible and non-intrusive
- apply/edit path shows deterministic validation result
- no success UI on gated provider paths

### P1-03 Preview Runtime Stability
1. Objective: improve reliability/perf of supported preview modes.
2. Files:
- `cloud-web-app/web/components/ide/PreviewPanel.tsx`
- `cloud-web-app/web/app/api/files/raw/route.ts`
3. Done criteria:
- supported file types render consistently
- large payload gate stays explicit
- unsupported types remain explicit without fake CTA

### P1-04 Admin Actionability
1. Objective: admin pages remain enterprise and operational.
2. Files:
- `cloud-web-app/web/app/admin/page.tsx`
- `cloud-web-app/web/app/admin/payments/page.tsx`
- `cloud-web-app/web/app/admin/apis/page.tsx`
- `cloud-web-app/web/app/admin/security/page.tsx`
3. Done criteria:
- no decorative widget without action
- every critical action returns transactable success/error feedback
- keyboard and focus visibility preserved

### P1-05 Runtime Warning Control
1. Objective: reduce operational noise while preserving strict gates.
2. Files:
- `cloud-web-app/web/next.config.js`
- `cloud-web-app/web/app/api/**/route.ts` (runtime-sensitive only)
- `audit dicas do emergent usar/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
3. Done criteria:
- warning inventory updated with root-cause status
- no regression in `qa:enterprise-gate`

## 2. P2 Priorities (After P1 Freeze)
### P2-01 Collaboration Readiness Gate
1. Objective: formalize stability claims before promotion.
2. Files:
- `audit dicas do emergent usar/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`
- `cloud-web-app/web/docs/AI_RUNTIME_SLO.md`
3. Done criteria:
- explicit SLO for reconnect/conflict/concurrency
- status remains `PARTIAL` until criteria met

### P2-02 Agentic Promotion Gate (L4/L5)
1. Objective: block inflated claims without evidence.
2. Files:
- `audit dicas do emergent usar/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
- `audit dicas do emergent usar/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md`
3. Done criteria:
- promotion rubric documented
- no L4/L5 claim without reproducible operational evidence

### P2-03 Legacy Route Cutoff Completion
1. Objective: complete phaseout safely by telemetry.
2. Files:
- `cloud-web-app/web/app/api/workspace/tree/route.ts`
- `cloud-web-app/web/app/api/workspace/files/route.ts`
- `cloud-web-app/web/app/api/auth/sessions/route.ts`
- `cloud-web-app/web/app/api/auth/sessions/[id]/route.ts`
3. Done criteria:
- 2-cycle policy executed
- removal only after usage criteria

### P2-04 Visual Regression Maturity
1. Objective: keep studio-quality UI stable across releases.
2. Files:
- `.github/workflows/ui-audit.yml`
- `.github/workflows/visual-regression-compare.yml`
- `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
3. Done criteria:
- visual and contract gates fail PR on regressions
- no manual bypass in normal flow

## 3. Execution Order (Strict)
1. P1-01
2. P1-02
3. P1-03
4. P1-04
5. P1-05
6. P2-01
7. P2-02
8. P2-03
9. P2-04

## 4. Mandatory Gate Before Marking Any Item Done
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run qa:interface-gate`
5. `npm run qa:canonical-components`
6. `npm run qa:route-contracts`
7. `npm run qa:no-fake-success`
8. `npm run qa:mojibake`
9. `npm run qa:enterprise-gate`
