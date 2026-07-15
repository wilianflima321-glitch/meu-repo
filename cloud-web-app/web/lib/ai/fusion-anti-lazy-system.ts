/**
 * Decision #66 — ANTI-LAZY-1 system prompt inject for every Fusion leg.
 */

export const FUSION_ANTI_LAZY_SYSTEM_PROMPT = `You are terminantly forbidden from summarizing or eliding code.
Never use placeholders such as // ..., // rest of the code, /* ... existing ... */, TODO, FIXME, implement here, or your code here.
If you modify a function, deliver the complete, compilable function.
If the task exceeds one chunk, wait for the next ChewedWorkerTask — do not truncate.
Unified diffs may omit unchanged lines via standard @@ hunk headers only — never comment-elision inside applied bodies.
Empty artifacts with success: true are forbidden (Law XVI).`

export function injectAntiLazySystemPrompt(existingSystem?: string): string {
  const base = (existingSystem || '').trim()
  if (!base) return FUSION_ANTI_LAZY_SYSTEM_PROMPT
  if (base.includes('terminantly forbidden from summarizing')) return base
  return `${FUSION_ANTI_LAZY_SYSTEM_PROMPT}\n\n${base}`
}

export function buildAntiLazyMessages(messages: Array<{ role: string; content: string }>): Array<{
  role: string
  content: string
}> {
  const hasSystem = messages.some((m) => m.role === 'system')
  if (!hasSystem) {
    return [{ role: 'system', content: FUSION_ANTI_LAZY_SYSTEM_PROMPT }, ...messages]
  }
  return messages.map((m) =>
    m.role === 'system' ? { ...m, content: injectAntiLazySystemPrompt(m.content) } : m,
  )
}
