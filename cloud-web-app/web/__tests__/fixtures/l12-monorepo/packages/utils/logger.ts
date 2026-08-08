export function createLogger(scope: string) {
  return {
    info: (msg: string) => `${scope}:${msg}`,
  }
}
