/**
 * CW5 / R12 — Figma token government honesty.
 *
 * Code-side DesignTokenSync + Storybook token sync are real.
 * Live Figma Variables / MCP / Dev Mode sync is not shipped — keep marketing fail-closed.
 */

export const CW5_FIGMA_TOKEN_GOVERNMENT_READY = false as const

export const CW5_FIGMA_HELD_REASON =
  'Code-side DesignTokenSync + Storybook token sync only; no live Figma Variables/MCP government' as const

export const CW5_STORYBOOK_TOKEN_SYNC_READY = true as const
