import { describe, expect, it } from 'vitest'

import {
  parseToolArguments,
  parseToolArgumentsResult,
  repairJsonLike,
} from '@/lib/ai/advanced-ai-provider-normalizers'

describe('parseToolArgumentsResult', () => {
  it('parses clean JSON without repair', () => {
    const result = parseToolArgumentsResult('{"path":"a.ts","content":"x"}')
    expect(result.arguments).toEqual({ path: 'a.ts', content: 'x' })
    expect(result.malformed).toBe(false)
    expect(result.repaired).toBe(false)
  })

  it('treats empty payloads as empty args, not malformed', () => {
    expect(parseToolArgumentsResult('').malformed).toBe(false)
    expect(parseToolArgumentsResult('   ').arguments).toEqual({})
  })

  it('recovers JSON wrapped in markdown fences', () => {
    const raw = '```json\n{"path":"a.ts"}\n```'
    const result = parseToolArgumentsResult(raw)
    expect(result.arguments).toEqual({ path: 'a.ts' })
    expect(result.repaired).toBe(true)
    expect(result.malformed).toBe(false)
  })

  it('recovers JSON surrounded by prose', () => {
    const raw = 'Here are the arguments: {"name":"hero","level":3} hope this helps'
    const result = parseToolArgumentsResult(raw)
    expect(result.arguments).toEqual({ name: 'hero', level: 3 })
    expect(result.repaired).toBe(true)
  })

  it('strips trailing commas', () => {
    const result = parseToolArgumentsResult('{"a":1,"b":2,}')
    expect(result.arguments).toEqual({ a: 1, b: 2 })
    expect(result.repaired).toBe(true)
  })

  it('flags truly unrecoverable payloads as malformed', () => {
    const result = parseToolArgumentsResult('not json at all <<<')
    expect(result.arguments).toEqual({})
    expect(result.malformed).toBe(true)
  })
})

describe('repairJsonLike', () => {
  it('extracts the first balanced object ignoring nested braces in strings', () => {
    expect(repairJsonLike('prefix {"a":"}{"} suffix')).toBe('{"a":"}{"}')
  })

  it('returns null when there is no JSON-like content', () => {
    expect(repairJsonLike('hello world')).toBeNull()
    expect(repairJsonLike('')).toBeNull()
  })
})

describe('parseToolArguments backward compatibility', () => {
  it('still returns a plain record', () => {
    expect(parseToolArguments('{"x":1}')).toEqual({ x: 1 })
    expect(parseToolArguments('garbage')).toEqual({})
  })
})
