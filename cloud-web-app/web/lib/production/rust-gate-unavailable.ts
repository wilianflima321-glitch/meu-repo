/**
 * Law XI honesty guard — Rust (`.rs`) dual-stack validation is NOT wired into the
 * live AI-apply pipeline. `.cursorrules` / `CLAUDE.md` bind: "Critic forbidden from
 * approving Desktop/backend patches without green Rust gates" (`cargo check` +
 * `cargo clippy -- -D warnings` + `cargo test`). Running those commands requires an
 * isolated sandbox (Onda L / L.1 `ForgeSandboxExecutor`) — spawning `cargo` for an
 * arbitrary agent-authored patch on the host would violate `AgentShellPolicy` (#48).
 *
 * Before this guard, `agent-apply-validation-gate.ts` silently bucketed `.rs` files
 * into the same `skipped_non_ts` / implicit-pass path as any other non-TS file
 * (images, JSON, markdown) — meaning an AI could apply an unreviewed Rust patch to a
 * user's project with ZERO validation while the UI treated it as clean. That is the
 * exact "fail-closed ≠ mock" violation the Zero-MVP doctrine forbids.
 *
 * Fail-closed replacement: `.rs` writes through the AI-apply pipeline are BLOCKED
 * with a clear, actionable reason until L.1 ships — never silently approved.
 */

export function isRustSourcePath(filePath: string): boolean {
  return /\.rs$/i.test(filePath.replace(/\\/g, '/'))
}

export const RUST_GATE_SANDBOX_UNAVAILABLE = 'RUST_GATE_SANDBOX_UNAVAILABLE' as const

export interface RustGateUnavailableDetail {
  code: typeof RUST_GATE_SANDBOX_UNAVAILABLE
  message: string
}

export function buildRustGateUnavailableDetail(filePath: string): RustGateUnavailableDetail {
  return {
    code: RUST_GATE_SANDBOX_UNAVAILABLE,
    message:
      `AI apply for "${filePath}" was blocked: Law XI requires cargo check + cargo clippy + ` +
      'cargo test on every Rust change, and that dual-stack gate only runs inside an isolated ' +
      'sandbox (Onda L / L.1 ForgeSandboxExecutor), which is not available yet. Apply this ' +
      'change yourself in your local toolchain and run the Rust gates manually, or wait for ' +
      'L.1. Nothing was written.',
  }
}
