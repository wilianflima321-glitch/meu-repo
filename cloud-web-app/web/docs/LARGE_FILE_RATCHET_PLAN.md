# Large File Ratchet Plan

Generated: deterministic local scan

- Watch line limit: 800
- Files above watch limit: 0 / 0
- Max file lines: 0 / 800
- Low-import large modules: 0 / 0
- Low-import threshold: <= 1 import hint
- Failures: 0

## Category Counts

## Top Refactor Queue

| File | Lines | Import hints | Category | Next action |
| --- | ---: | ---: | --- | --- |

## Low-Import Large Modules

These are the most suspicious modules: large enough to affect maintainability, but with little evidence that product surfaces depend on them directly.

| File | Lines | Import hints | Category | Required decision |
| --- | ---: | ---: | --- | --- |

## Ratchet Policy

- Do not add new files above 800 lines.
- Do not let any file exceed 800 lines without an explicit ratchet update.
- Do not increase low-import large modules above 0; new large modules need product wiring, adapter evidence, or archive decision.
- Split UI surfaces before adding features.
- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.

## Failures
- none
