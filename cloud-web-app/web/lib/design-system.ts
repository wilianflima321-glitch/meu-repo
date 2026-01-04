/**
 * Design system initialization helpers.
 *
 * Keep this intentionally lightweight: it should not hard-code new theme tokens.
 * If CSS variables are already provided via global styles, this becomes a no-op.
 */

export function createCSSCustomProperties(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // If the app already defines design tokens (CSS vars), do nothing.
  // This avoids introducing new, hard-coded colors/tokens in JS.
  const existing = getComputedStyle(root).getPropertyValue('--color-primary-500');
  if (existing && existing.trim().length > 0) return;

  // Fallback: ensure we at least set a stable attribute that CSS can hook into.
  // (No visual change unless CSS uses it.)
  if (!root.dataset.theme) {
    root.dataset.theme = 'default';
  }
}
