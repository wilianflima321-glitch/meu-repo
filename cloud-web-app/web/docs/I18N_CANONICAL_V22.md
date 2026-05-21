# I18N Canonical V22

The product now treats `next-i18next` plus `public/locales/{locale}` as the canonical translation system.

## Decision

- Canonical runtime: `next-i18next`.
- Canonical files: `public/locales/{en,pt-BR,es,fr,ja,zh}/common.json`.
- Default locale: `en`.
- Legacy compatibility: removed.
- New UI components must not import `lib/translations.ts`, `lib/i18n.ts`, or `lib/locales/pt-BR.ts`.

## Why

Aethel had multiple translation paths. That makes product copy hard to govern and increases the risk of Portuguese/English drift in public surfaces. The canonical path keeps app copy predictable, easy to scan, and compatible with the existing public locale folders.

## Migration Order

1. Move active UI copy into `public/locales/*/common.json`.
2. Keep route-level copy in English unless it is explicitly localized through `next-i18next`.
3. Block new imports from `lib/translations.ts`, `lib/i18n.ts`, and `lib/locales/*`.
4. Treat any future locale drift as a product-surface regression, not a docs-only issue.

## Gate

Run `npm run qa:i18n-canonical`.
