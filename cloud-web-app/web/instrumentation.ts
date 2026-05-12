export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initObservability } = await import('./lib/observability/tracing')
    initObservability({ runtime: 'nodejs' })
  }
}