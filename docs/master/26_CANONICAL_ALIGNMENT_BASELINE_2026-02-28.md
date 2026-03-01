# 26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28
Status: CANONICAL BASELINE
Date: 2026-02-28
Owner: PM Técnico + Critical Agent

## 1) Purpose
Define one active baseline for all canonical docs and remove interpretation drift between historical deltas.

If any active canonical doc conflicts with this baseline, this file wins until a newer dated baseline is published.

## 2) Active baseline (factual)
Source evidence:
1. `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
2. `tools/check-repo-connectivity.mjs`

Current values:
1. `legacy-accent-tokens=0`
2. `admin-light-theme-tokens=0`
3. `admin-status-light-tokens=0`
4. `blocking-browser-dialogs=0`
5. `not-implemented-ui=6`
6. `qa:repo-connectivity=PASS`

## 3) Interpretation rules
1. Older references like `not-implemented-ui=10` are historical and must not be used as current status.
2. Older local-environment notes (e.g., past `spawn EPERM`) are historical unless reconfirmed in the current wave.
3. Active execution claims must always point to this baseline plus latest command evidence.

## 4) Claim gates
1. No "equal/superior" claim without evidence in canonical docs.
2. No L4/L5 promotion without reproducible operational proof.
3. No desktop Unreal/Premiere parity claim in browser scope.

## 5) Scope lock
1. `/dashboard` remains entry surface.
2. `/ide` remains advanced shell of the same platform.
3. No fake-success and no hidden fallback claims.

## 6) UX market-readiness lock (added 2026-02-28)
1. Strong engineering quality does not equal UX market leadership by default.
2. Market-level UX claim is blocked until `31_EXECUTIVE_REALITY_GAP_ALIGNMENT_2026-02-28.md` closures are evidenced:
- telemetry baseline,
- AI setup recovery UX,
- real-time preview flow,
- first-value onboarding,
- responsive entry surfaces.
