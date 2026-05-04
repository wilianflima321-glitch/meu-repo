# 105_RELIABILITY_INCIDENT_RESPONSE_GATE_2026-05-04
Date: 2026-05-04
Status: ACTIVE
Role: Reliability Incident Response Gate for Aethel Studio public reliability and incident-response contract

## Why This Exists
Audit V12 called out that reliability, SLO/SLA, status, and enterprise trust were still too easy to overclaim. The product already had `/status` and readiness checks, but there was no public page that explained incident response, severity language, response targets, and the limits of current evidence.

This gate turns that gap into an executable contract.

## Implemented Contract
- `/reliability` is the public reliability page.
- `/reliability` links to `/status`, `/trust`, `/security-policy`, `/docs/procurement-starter-pack`, and `/contact-sales`.
- The page names incident response explicitly.
- The page defines Sev 1, Sev 2, and Sev 3 as the public incident grammar.
- The page names response targets without presenting them as contractual SLA.
- The page states that no rolling uptime and public incident history are still open gaps.
- `/trust`, the public footer, and the sitemap include `/reliability`.

## No Overclaim Rules
The page must not claim:
- fake uptime percentages,
- five nines,
- guaranteed uptime,
- SLA guaranteed,
- or contractual availability without production evidence and an enterprise contract.

Reliability language must stay factual: status, incident response, response targets, readiness, public gaps, and enterprise handoff.

## Validation
Run:

```bash
npm run qa:reliability-incident
npm --prefix cloud-web-app/web test -- __tests__/app/reliability-incident-contract.test.ts
npm run qa:product-quality-progress
```

## Product Reading
The best-market pattern is not to hide incidents or invent reliability maturity. Vercel and GitHub expose component health through status pages; Atlassian's incident-management guidance reinforces clear process, roles, severity, communication, and post-incident learning. Aethel should follow that discipline while admitting what is not yet live.

## Remaining Gaps
- Add public incident history with postmortems.
- Add a real rolling uptime source after production telemetry exists.
- Add formal enterprise SLA language only after legal, support, and monitoring evidence exists.
- Connect incident ownership to support, operator, AI/runtime, deploy, billing, and marketplace domains.
