# 103_PUBLIC_TRUST_CENTER_GATE_2026-05-04
Date: 2026-05-04
Status: ACTIVE
Role: public trust center execution gate for buyer proof, security disclosure, and no overclaim compliance language

## Why This Exists
Audit V12 called out a real gap: the product had security, compliance, status, audit-log, and procurement pieces, but no single public trust entry point.

The best market pattern is visible in mature developer products:
- a short trust center,
- deep links to security, privacy, compliance, and status,
- clear responsible disclosure,
- and careful compliance language.

Aethel must follow that pattern without pretending certifications, SLO/SLA guarantees, or enterprise controls are finished before there is evidence.

## Implemented Contract
- `/trust` exists as the public trust center entry.
- `/trust` links to `/security`, `/security-policy`, `/compliance`, `/status`, `/privacy`, `/terms`, and `/contact-sales`.
- `/trust` uses the existing `TrustCenterPageShell` so trust, security, and compliance share one visual grammar.
- Public navigation points to `/trust` instead of adding another scattered security link.
- Public footer exposes `/trust` while preserving deeper security and compliance pages.
- Sitemap includes `/trust`.

## No Overclaim Rules
The trust center must not:
- claim `SOC 2 certified`,
- claim `ISO 27001 certified`,
- invent uptime percentages,
- imply SLO/SLA maturity without operational evidence,
- or treat roadmap items as shipped enterprise features.

It may say:
- `SOC 2 preparation`,
- `responsible disclosure`,
- `audit activity`,
- `GDPR target`,
- and `procurement assisted`.

## Validation
Run:

```bash
npm run qa:public-trust-center
```

This gate verifies:
- route existence,
- required links,
- footer/nav/sitemap wiring,
- no fake certification claim,
- no hardcoded hex or console usage,
- test coverage,
- and documentation alignment.

## Product Reading
This improves `Buyer / Trust / Docs` without making Web Light or Studio Home heavier.

The public experience stays clean:
- first-time users still see the mission-first AI entry,
- builders still go into Studio,
- buyers and security reviewers get `/trust` as their due-diligence map,
- researchers get responsible disclosure without needing to contact sales first.

## Next Gaps
- Turn responsible disclosure into a fuller safe-harbor policy.
- Add incident-history artifacts when there is factual production history.
- Add formal procurement artifacts as they become real.
- Keep certification language evidence-based.
