# 104_SECURITY_DISCLOSURE_SAFE_HARBOR_GATE_2026-05-04
Date: 2026-05-04
Status: ACTIVE
Role: responsible disclosure and safe-harbor gate for public security review

## Why This Exists
Audit V12 called out missing bug-bounty / responsible-disclosure maturity as an enterprise trust gap.

The public `/trust` route now gives buyers one map, but researchers still need a concrete disclosure policy:
- where to report,
- what is allowed,
- what is out of scope,
- what response target to expect,
- and how acknowledgments happen.

This gate keeps the policy concrete without creating fake maturity.

## Implemented Contract
- `/security-policy` now includes `Responsible disclosure`.
- The policy names `safe harbor` for good-faith, non-destructive, coordinated testing.
- The policy includes `security@aethel.dev` and a `mailto:` link.
- It separates in-scope surfaces from out-of-scope activity.
- It calls out AI/agent-specific risk around browser operator, tool calls, runtime, memory, files, approvals, and irreversible actions.
- It states response targets as targets, not contractual SLA.
- `/security-policy`, `/security-acknowledgments`, and `/trust` link to each other.
- Sitemap includes `/security-policy` and `/security-acknowledgments`.

## No Overclaim Rules
The page must not:
- claim a public bug bounty is live,
- promise guaranteed reward,
- convert response targets into contractual SLA,
- invite destructive or privacy-invasive testing,
- or imply certification/enterprise maturity beyond evidence.

It may say:
- `safe harbor`,
- `coordinated disclosure`,
- `response targets`,
- `not a contractual SLA`,
- and `not a formal bounty`.

## Validation
Run:

```bash
npm run qa:security-disclosure
```

This gate verifies:
- page existence,
- safe-harbor language,
- disclosure email,
- scope and out-of-scope language,
- AI/agent-specific risk language,
- non-SLA/non-bounty wording,
- links between trust, policy, and acknowledgments,
- sitemap coverage,
- tests,
- and documentation alignment.

## Product Reading
This improves trust without making the initial product heavier.

For user experience:
- leigos still get Web Light and Studio Home,
- buyers get `/trust`,
- researchers get `/security-policy`,
- public acknowledgments stay factual and empty until real coordinated reports exist.

## Next Gaps
- Add a formal vulnerability intake form once routing, abuse prevention, and notifications are ready.
- Add severity taxonomy tied to internal incident response.
- Add safe-harbor legal review before marketing this as a mature bug-bounty program.
