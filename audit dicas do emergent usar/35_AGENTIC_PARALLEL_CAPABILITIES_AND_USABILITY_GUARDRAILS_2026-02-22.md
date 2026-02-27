# 35_AGENTIC_PARALLEL_CAPABILITIES_AND_USABILITY_GUARDRAILS_2026-02-22
Status: DECISION-COMPLETE CAPABILITY + UX GUARDRAIL SPEC
Date: 2026-02-22
Owner: PM Tecnico + AI Architect + Security Lead + UX Lead

## 0) Objective
1. Align multi-agent parallel execution with professional usability and hard safety limits.
2. Keep one experience (`/dashboard` -> `/ide`) with no duplicate behavior and no fake-success.
3. Define explicit boundaries for what agents can and cannot do, including web automation use cases.

## 1) What AI still cannot do reliably (factual constraints)
1. Guarantee long-horizon coherence without canon/context tooling.
2. Infer "fun" and conquest feeling without telemetry + human playtest.
3. Execute sensitive external actions safely without explicit policy and confirmation.
4. Preserve temporal media consistency at scale without dedicated validation.
5. Replace deterministic review gates in code/media pipelines.

## 2) Mandatory mitigation stack
1. Canon lock (`character/story/project rules`) before apply.
2. Deterministic flow: `plan -> patch -> validate -> apply -> rollback`.
3. Capability/risk policy for Full Access scopes.
4. Manual confirmation for sensitive but allowed classes.
5. Hard block for high-risk classes.

## 3) Full Access action policy (runtime contract)
Scope model:
1. `project`
2. `workspace`
3. `web_tools`

Action classes:
1. `project_read`, `project_write`
2. `workspace_read`, `workspace_write`, `workspace_command`
3. `web_navigation`, `web_form_submit`, `deploy_release`, `domain_dns_change`, `account_link`
4. hard-risk classes: `financial_transaction`, `account_security_change`, `credential_export`

Rules:
1. Hard-risk classes are blocked in all plans/scopes.
2. Manual confirmation required for:
- `workspace_command`
- `web_form_submit`
- `deploy_release`
- `domain_dns_change`
3. `domain_dns_change` is enterprise-only in this phase.
4. Any blocked class must return explicit contract error (no fallback).

## 4) Usability spec for manual content editing (studio-grade)
1. Ingestion:
- batch import with per-file validation and retry.
- all assets start as `draft`.
2. Editing:
- non-destructive operations and strong undo/redo.
- explicit states: `draft`, `validating`, `review`, `approved`, `blocked`, `published`.
3. Review:
- reviewer must approve before apply/export.
- diffs must be visible (code/media/metadata).
4. Publishing:
- export blocked when quality/perf gates fail.
- rollback token available for each apply.

## 5) Gameplay/conquest design guardrails
1. Every project must define:
- core loop
- difficulty curve
- reward cadence
- failure recovery rule
2. Promotion of gameplay changes requires:
- telemetry evidence
- regression check
- human validation on target scenarios.

## 6) Parallel agent model (no-overlap policy)
1. Agents may research/build in parallel.
2. Shared truth comes from approved artifacts only (not raw transcript).
3. `apply` stays serial and reviewer-gated.
4. No hidden autonomous transaction paths.

## 7) API contract extension introduced in this wave
`POST /api/studio/access/full`
1. Optional request keys:
- `intendedActionClass`
- `confirmManualAction`
2. New explicit error outcomes:
- `INVALID_ACTION_CLASS` (`400`)
- `ACTION_CLASS_BLOCKED` (`403`)
- `ACTION_CLASS_NOT_ALLOWED_FOR_SCOPE` (`403`)
- `MANUAL_CONFIRMATION_REQUIRED` (`409`)
3. Success metadata includes policy summary:
- allowed classes
- manual confirm classes
- blocked classes

## 8) Claim boundaries
1. We do not claim unrestricted "do anything on web/accounts".
2. We do not claim full Unreal/Premiere parity in current active runtime.
3. We do not claim L4/L5 autonomy without reproducible evidence gates.
