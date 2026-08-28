---
name: aethel-autonomous-coder
description: Autonomous AAA coding workflow engine inspired by Cursor Composer and Roo Code. Use whenever writing, refactoring, debugging, or implementing complex features in Rust (Tauri/wgpu) or TypeScript (Next.js/Three.js) to enforce self-healing compilation loops, deep AST analysis, zero truncation, and relentless execution without stopping.
---

# Aethel Autonomous Coder (Cursor / Roo Code Supremacy Mode)

This skill elevates the agent to the speed, autonomy, and architectural precision of Roo Code and Cursor Composer.

## Core Behavioral Loop (relentless execution)

When given an implementation or refactoring task:

### 1. Deep Context Sweep (No Guessing)
- Run `grep_search` across `cloud-web-app/web/lib/` or `apps/studio-local/src-tauri/` to identify all dependent types, imports, and callers.
- Inspect the actual implementations with `view_file`.
- NEVER invent mock APIs or placeholder functions.

### 2. Multi-File Atomic Edits
- Plan all touchpoints across both frontend and backend.
- Apply full, production-ready code with `replace_file_content` or `multi_replace_file_content`.
- Prohibit any `// TODO`, `/* code omitted */`, or partial stubs.

### 3. Self-Healing Compilation & Quality Loop (Autonomous)
- **Rust Scope:** Run `cargo check` and `cargo clippy` in `apps/studio-local/src-tauri/`. If errors occur, parse compiler diagnostics, fix the source files immediately, and re-run until clean.
- **TypeScript Scope:** Run `npm run typecheck` and `npm run lint` in `cloud-web-app/web/`. If type errors or lint warnings occur, fix immediately.
- **Do not stop or ask user for permission** during the fix loop. Iterate autonomously until 100% clean.

### 4. Verification & Ledger Sync
- Validate runtime behavior.
- Update `AETHEL_FOCUS1_EXECUTION_PROGRESS.md` or relevant architecture ledger upon completion.
