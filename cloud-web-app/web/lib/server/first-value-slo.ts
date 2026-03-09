export function parseFirstValueMs(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function getFirstValueSloTargetMs(): number {
  return parseFirstValueMs(process.env.AETHEL_FIRST_VALUE_SLO_MS, 90_000)
}

export function getFirstValueMinSample(): number {
  return parseFirstValueMs(process.env.AETHEL_FIRST_VALUE_MIN_SAMPLE, 10)
}
