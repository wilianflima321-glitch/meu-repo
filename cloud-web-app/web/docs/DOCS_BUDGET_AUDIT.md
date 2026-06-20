# DOCS_BUDGET_AUDIT.md
Generated: deterministic local scan

This is a hard documentation budget. Historical archive markdown was removed from the live tree and remains recoverable from Git history.

| Scope | Count | Budget |
| --- | ---: | ---: |
| repoMarkdown | 328 | 336 |
| rootDocs | 199 | 200 |
| rootMaster | 122 | 134 |
| rootArchive | 0 | 0 |
| interfaceBlueprints | 20 | 20 |
| webDocs | 67 | 67 |

## Collapse Targets

- Root `docs/archive`: must stay empty; historical bulk docs live in Git history, not the active tree.
- Root `docs/master`: reduce to about 40 active canonical docs with explicit status.
- `AETHEL_INTERFACE_BLUEPRINTS`: keep intact; these remain high-value product architecture docs.
- Web `docs`: keep generated QA evidence, but do not let gates become a second archive.

## Failures
- none
