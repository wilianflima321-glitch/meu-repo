/**
 * Minimal type shims for @tauri-apps/api modules.
 *
 * These are dynamically imported at runtime only when running inside the
 * Tauri desktop app (detected via window.__TAURI_INTERNALS__).
 * On the web-only Next.js build the imports are never actually executed.
 *
 * We declare the modules as `any` so TypeScript does not error on the
 * dynamic `import()` calls; actual type safety is provided at runtime by
 * the guard `isTauriRuntime()` checks in each caller.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '@tauri-apps/api/http' { const value: any; export = value }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '@tauri-apps/api/core' { const value: any; export = value }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '@tauri-apps/api/event' { const value: any; export = value }
