# WCAG Critical Surface Audit

Date: 2026-03-01  
Scope: P1-R evidence baseline (critical surfaces only)

## 1) Surfaces audited
1. `/` (`app/landing-v2.tsx`)
2. `/dashboard` (`components/AethelDashboard.tsx` + extracted tabs)
3. `/ide` (`components/ide/FullscreenIDE.tsx`, `components/ide/FileExplorerPro.tsx`, `components/ide/PreviewPanel.tsx`)
4. `/settings` (`app/settings/page.tsx`)
5. `/admin/analytics` (`app/admin/analytics/page.tsx`)
6. `/admin/collaboration` (`app/admin/collaboration/page.tsx`)
7. `/login` and `/register` (`app/(auth)/login/login-v2.tsx`, `app/(auth)/register/register-v2.tsx`)

## 2) Evidence matrix
| Area | Status | Evidence |
|---|---|---|
| Keyboard focus visibility | PARTIAL | Global focus ring + keyboard menu flow in explorer + skip links in auth pages |
| Semantic landmarks | PARTIAL | `main`/`region` present in critical pages; not full pass in all legacy routes |
| Error/empty/loading consistency | PARTIAL | Shared `.aethel-state*` classes adopted in admin/settings/preview/chat surfaces |
| Blocking dialogs | IMPLEMENTED | `qa:interface-gate` enforces `blocking-browser-dialogs=0` |
| Color contrast governance | PARTIAL | Dark palette stabilized; light theme tokens added (`data-aethel-theme='light'`) |
| Provider gate recoverability | IMPLEMENTED | Capability-gated AI routes + guided setup UX (`/settings?tab=api`) |
| Screen-reader labels on auth | PARTIAL | Form errors mapped with `aria-describedby`, invalid states + social button labels |
| Motion reduction | PARTIAL | Baseline support exists; full cross-surface verification pending |

## 3) Open gaps (must close for P1-R complete)
1. Run dedicated WCAG AA contrast verification across light/dark for dashboard/ide/admin.
2. Complete landmark/aria labeling pass on remaining legacy admin surfaces.
3. Upgrade automated accessibility gate from static critical checks to runtime checks (axe/Lighthouse) for critical flows:
 - landing -> register/login -> dashboard
 - dashboard -> ide -> preview fallback/runtime
4. Publish runtime test artifacts (screenshots/reports) in CI evidence bundle.

## 4) Automated gate baseline
1. Static accessibility gate is operational via `npm run qa:wcag-critical`.
2. Gate file: `cloud-web-app/web/scripts/check-wcag-critical-surfaces.mjs`.
3. Coverage currently enforced:
 - skip links + main landmarks on landing/dashboard/auth;
 - mobile navigation accessibility control wiring (`aria-controls`/`aria-expanded`);
 - provider recovery path presence on settings surface.
4. Runtime accessibility evidence gate is now wired in CI UI audit:
 - `tools/ide/ui-audit/run_audit.js` (capture + axe),
 - `tools/ide/ui-audit/assert_a11y_report.js` (threshold assertion on critical pages),
 - baseline threshold currently `maxViolationsPerPage=20` (to be reduced over time).

## 5) Current claim policy
1. Accessibility readiness remains `PARTIAL`.
2. No full WCAG AA compliance claim until items in section 3 are closed with reproducible evidence.
