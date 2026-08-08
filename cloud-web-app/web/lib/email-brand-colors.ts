/**
 * Email HTML brand palette — source of truth for transactional mail.
 *
 * Most email clients do not resolve CSS custom properties, so hex must be
 * inlined. Literals live only in this file (scanner-excluded, like
 * design-tokens.ts / DesignTokenSync.ts). Templates import these constants.
 *
 * Token map (document for Progress / L.10):
 *   textBody      ↔ --aethel-text-muted (light-mail body ink)
 *   headerFrom/To ↔ --aethel-indigo / --aethel-accent gradient
 *   cta / ctaHover↔ --aethel-indigo / indigo-dark
 *   contentBg     ↔ --aethel-surface-contrast
 *   border        ↔ light gray border (mail chrome)
 *   footerBg/text ↔ soft gray chrome
 *   highlightBg   ↔ light gray highlight
 *   resolvedBg/Bd ↔ --aethel-success-* light surfaces
 *   resolvedTitle ↔ success-dark green
 *   supportGrad*  ↔ support purple gradient (legacy support lane)
 */

export const EMAIL_BRAND = {
  textBody: '#333333',
  headerFrom: '#6366f1',
  headerTo: '#8b5cf6',
  contentBg: '#ffffff',
  border: '#e5e7eb',
  footerBg: '#f9fafb',
  footerText: '#6b7280',
  cta: '#6366f1',
  ctaHover: '#4f46e5',
  highlightBg: '#f3f4f6',
  /** Support notifications lane (slightly warmer indigo) */
  supportGradFrom: '#667eea',
  supportGradTo: '#764ba2',
  supportCta: '#667eea',
  resolvedBg: '#f0fdf4',
  resolvedBorder: '#86efac',
  resolvedTitle: '#166534',
} as const

export type EmailBrandKey = keyof typeof EMAIL_BRAND
