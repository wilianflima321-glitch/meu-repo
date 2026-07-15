import { describe, expect, it } from 'vitest'

import {
  buildI18nSingleSourceContract,
  evaluateLocaleTokenUse,
  validateI18nSingleSourceContract,
} from '@/lib/i18n/single-source-contract'

describe('i18n single source contract', () => {
  it('keeps next-i18next and public locales as the only canonical copy source', () => {
    const contract = buildI18nSingleSourceContract()

    expect(contract.canonicalSystem).toBe('next-i18next')
    expect(contract.canonicalLocaleRoot).toBe('cloud-web-app/web/public/locales')
    expect(contract.defaultLocale).toBe('en')
    expect(contract.supportedLocales).toEqual(['en', 'pt-BR', 'es', 'fr', 'ja', 'zh'])
    expect(validateI18nSingleSourceContract(contract)).toEqual([])
  })

  it('blocks legacy localization modules from importing back into product surfaces', () => {
    const contract = buildI18nSingleSourceContract()

    expect(contract.legacyModules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modulePath: 'cloud-web-app/web/lib/localization-system.ts',
          policy: 'candidate-for-removal',
          allowedImporters: [],
        }),
      ]),
    )
  })

  it('allows pt-BR as technical locale metadata but not arbitrary route copy', () => {
    expect(
      evaluateLocaleTokenUse({
        surfaceTier: 'authenticated-product',
        useCase: 'speech-recognition',
        token: 'pt-BR',
      }),
    ).toMatchObject({ state: 'available', allowed: true })

    expect(
      evaluateLocaleTokenUse({
        surfaceTier: 'premium-public',
        useCase: 'route-copy',
        token: 'pt-BR',
      }),
    ).toMatchObject({ state: 'blocked', allowed: false })
  })
})
