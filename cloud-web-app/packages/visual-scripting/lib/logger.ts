/**
 * Package-local, dependency-free logger shim.
 *
 * `@aethel/visual-scripting` must never import `web/lib/observability/logger`
 * (or any other `web/` module) — see Golden Rule 1 (Isomorfismo Fractal) in
 * CLAUDE_MASTER_EXECUTION_PLAN_V8: this package has to run standalone inside
 * a plain browser bundle or a Tauri WebView with zero Next.js server around
 * it (e.g. embedded in an exported game's modding runtime). A previous pass
 * only removed `@/` alias imports but left `../../web/lib/...` relative
 * imports in place, which is the same coupling spelled differently. This
 * shim keeps the same call shape (`info/warn/error/debug`) the rest of the
 * package already used, backed by `console` instead.
 */
export interface PackageLogger {
  debug(message: unknown, ...args: unknown[]): void;
  info(message: unknown, ...args: unknown[]): void;
  warn(message: unknown, ...args: unknown[]): void;
  error(message: unknown, ...args: unknown[]): void;
}

export function createComponentLogger(component: string): PackageLogger {
  const prefix = `[${component}]`;
  return {
    debug: (message, ...args) => console.debug(prefix, message, ...args),
    info: (message, ...args) => console.info(prefix, message, ...args),
    warn: (message, ...args) => console.warn(prefix, message, ...args),
    error: (message, ...args) => console.error(prefix, message, ...args),
  };
}
