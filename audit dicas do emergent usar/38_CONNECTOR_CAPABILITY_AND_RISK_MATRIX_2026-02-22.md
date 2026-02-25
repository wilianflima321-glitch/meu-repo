# 38_CONNECTOR_CAPABILITY_AND_RISK_MATRIX_2026-02-22
Status: DECISION-COMPLETE CONNECTOR MATRIX (SAFETY + USABILITY)
Date: 2026-02-22
Owner: Backend Lead + Security Lead + Billing Lead + PM Tecnico

## 0) Objective
1. Define what external connectors can do in current scope.
2. Prevent overclaim around "agents can do anything on web/accounts".
3. Keep one UX with explicit risk classes and hard blocks.

## 1) Global policy
1. All connector actions map to Full Access action classes.
2. High-risk classes remain blocked:
- `financial_transaction`
- `account_security_change`
- `credential_export`
3. Sensitive allowed actions require explicit manual confirmation:
- `workspace_command`
- `web_form_submit`
- `deploy_release`
- `domain_dns_change`

## 2) Connector matrix
| Connector domain | Typical actions | Current status | Action classes | Risk level | Policy |
|---|---|---|---|---|---|
| Project files | read/write/move/delete in project scope | IMPLEMENTED | `project_read`, `project_write` | medium | allowed in scope |
| Workspace tooling | shell commands, workspace-wide edits | PARTIAL | `workspace_read`, `workspace_write`, `workspace_command` | high | manual confirm on command |
| Web browsing tools | open pages, inspect docs, collect info | PARTIAL | `web_navigation` | medium | allowed in `web_tools` scope |
| Web form operations | submit forms, trigger external workflows | PARTIAL | `web_form_submit` | high | manual confirm required |
| Deploy/release actions | deploy app/build from approved pipeline | PARTIAL | `deploy_release` | high | manual confirm required |
| Domain/DNS operations | DNS mutation and domain config | NOT_IMPLEMENTED for non-enterprise | `domain_dns_change` | very high | enterprise-only + manual confirm |
| Account linking | OAuth/link service account | PARTIAL | `account_link` | high | explicit scope + audit trail |
| Financial operations | transfer/pay/invest/trade | BLOCKED | `financial_transaction` | critical | hard blocked |
| Account security mutation | password reset, 2FA disable, role mutation | BLOCKED | `account_security_change` | critical | hard blocked |
| Secret/credential export | reveal or exfiltrate secrets | BLOCKED | `credential_export` | critical | hard blocked |

## 3) Usability implications
1. User always sees what is blocked vs allowed in Studio Ops Bar.
2. Blocked actions return explicit API contract errors; no ambiguous fallback.
3. Manual confirm flow is required before sensitive actions can proceed.

## 4) API contract touchpoints
1. `POST /api/studio/access/full`
- optional `intendedActionClass`
- optional `confirmManualAction`
- explicit blocked/not-allowed/manual-confirm responses
2. `DELETE /api/studio/access/full/{id}`
- explicit revoke path remains unchanged

## 5) Promotion criteria
1. Connector moves from `PARTIAL` to `IMPLEMENTED` only with:
- operational runbook
- audit evidence
- rollback path
- no-fake-success and route-contract pass
2. Any new high-risk action class requires explicit canonical approval before runtime enablement.
