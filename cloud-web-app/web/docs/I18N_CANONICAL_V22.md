# I18N Canonical V22

The product now treats `next-i18next` plus `public/locales/{locale}` as the canonical translation system.

## Decision

- Canonical runtime: `next-i18next`.
- Canonical files: `public/locales/{en,pt-BR,es,fr,ja,zh}/common.json`.
- Default locale: `en`.
- Legacy compatibility: `lib/i18n.ts` may bridge `lib/translations.ts` for one release.
- New UI components must not import `lib/translations.ts` or `lib/locales/pt-BR.ts`.

## Why

Aethel had multiple translation paths. That makes product copy hard to govern and increases the risk of Portuguese/English drift in public surfaces. The canonical path keeps app copy predictable, easy to scan, and compatible with the existing public locale folders.

## Migration Order

1. Keep `lib/i18n.ts` as a compatibility adapter while old keys are migrated.
2. Move active UI copy into `public/locales/*/common.json`.
3. Remove component imports from `lib/locales/*`.
4. Delete `lib/translations.ts` and `lib/locales/pt-BR.ts` only after all consumers are gone.

## Gate

Run `npm run qa:i18n-canonical`.
