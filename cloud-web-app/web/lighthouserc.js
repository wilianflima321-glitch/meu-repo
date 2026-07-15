/**
 * Lighthouse CI configuration.
 *
 * Round 81 wires Lighthouse CI into PRs. Thresholds start just below the
 * current production reality (so the gate is green from day one) and will be
 * ratcheted up each round until we match the V5 audit target:
 *
 *   Performance   ≥ 0.90
 *   Accessibility ≥ 0.95
 *   Best practices ≥ 0.95
 *   SEO           ≥ 0.95
 *
 * Do NOT lower these numbers. Raise them as the product improves.
 */

module.exports = {
  ci: {
    collect: {
      // `startServerCommand` is driven by the workflow (`next start`).
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 120_000,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/pricing',
        'http://localhost:3000/login',
      ],
      numberOfRuns: 2,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        // Progressive thresholds — ratchet up, do NOT lower.
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        'categories:pwa': ['error', { minScore: 0.85 }],

        // Hard fail on a11y regressions that break WCAG AA.
        'color-contrast': 'error',
        'button-name': 'error',
        'link-name': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'image-alt': 'warn',

        // Soft signals we care about but don't block on yet.
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.25 }],
        'total-blocking-time': ['warn', { maxNumericValue: 800 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
