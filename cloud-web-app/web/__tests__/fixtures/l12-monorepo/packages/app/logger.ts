/** Basename collision with packages/utils/logger.ts — must not steal edges. */
export function appLogger(msg: string): string {
  return `app:${msg}`
}
