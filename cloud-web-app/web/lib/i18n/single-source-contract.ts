import type { V29OperationalState } from '@aethel/runtime/v29-internal-spine'

export type CanonicalLocaleCode = 'en' | 'pt-BR' | 'es' | 'fr' | 'ja' | 'zh'
export type I18nSurfaceTier = 'premium-public' | 'authenticated-product' | 'admin-internal' | 'runtime-log'
export type I18nLegacyModulePolicy = 'blocked-import' | 'compatibility-only' | 'candidate-for-removal'
export type LocaleTokenUseCase = 'route-copy' | 'date-format' | 'currency-format' | 'speech-recognition' | 'user-preference' | 'runtime-log'

export interface I18nLegacyModuleRule {
  modulePath: string
  policy: I18nLegacyModulePolicy
  state: V29OperationalState
  allowedImporters: string[]
  nextAction: string
}

export interface I18nSurfacePolicy {
  tier: I18nSurfaceTier
  state: V29OperationalState
  copySource: 'public-locales-only' | 'runtime-generated-no-user-copy'
  allowHardcodedPtBrCopy: false
  allowedLocaleTokenUseCases: LocaleTokenUseCase[]
  gates: string[]
}

export interface I18nSingleSourceContract {
  version: 1
  canonicalSystem: 'next-i18next'
  canonicalLocaleRoot: 'cloud-web-app/web/public/locales'
  defaultLocale: 'en'
  supportedLocales: CanonicalLocaleCode[]
  namespace: 'common'
  premiumCopyPolicy: 'EN default; localized copy only from public/locales'
  localeTokenPolicy: 'Locale codes are allowed only for formatting, speech, or user preference metadata.'
  legacyModules: I18nLegacyModuleRule[]
  surfacePolicies: I18nSurfacePolicy[]
  prohibitedPatterns: string[]
  nextAction: string
}

export const CANONICAL_I18N_LOCALES: CanonicalLocaleCode[] = ['en', 'pt-BR', 'es', 'fr', 'ja', 'zh']

export const I18N_LEGACY_MODULES: I18nLegacyModuleRule[] = [
  {
    modulePath: 'cloud-web-app/web/lib/localization-system.ts',
    policy: 'candidate-for-removal',
    state: 'held',
    allowedImporters: [],
    nextAction: 'Delete after zero imports and after remaining runtime-localization experiments move to public/locales.',
  },
  {
    modulePath: 'cloud-web-app/web/lib/localization/localization-system.tsx',
    policy: 'compatibility-only',
    state: 'held',
    allowedImporters: [],
    nextAction: 'Keep blocked from product surfaces; migrate any future caller to next-i18next dictionaries.',
  },
  {
    modulePath: 'cloud-web-app/web/lib/localization-system.default-en.ts',
    policy: 'candidate-for-removal',
    state: 'held',
    allowedImporters: [],
    nextAction: 'Remove once compatibility localization runtime has zero imports.',
  },
]

export const I18N_SURFACE_POLICIES: I18nSurfacePolicy[] = [
  {
    tier: 'premium-public',
    state: 'available',
    copySource: 'public-locales-only',
    allowHardcodedPtBrCopy: false,
    allowedLocaleTokenUseCases: ['date-format', 'currency-format'],
    gates: ['qa:i18n-canonical', 'qa:i18n-hardcoded-spine', 'qa:public-first-fold-budget'],
  },
  {
    tier: 'authenticated-product',
    state: 'available',
    copySource: 'public-locales-only',
    allowHardcodedPtBrCopy: false,
    allowedLocaleTokenUseCases: ['date-format', 'currency-format', 'speech-recognition', 'user-preference'],
    gates: ['qa:i18n-hardcoded-spine', 'qa:ide-visible-language-drift'],
  },
  {
    tier: 'admin-internal',
    state: 'needs-review',
    copySource: 'public-locales-only',
    allowHardcodedPtBrCopy: false,
    allowedLocaleTokenUseCases: ['date-format', 'currency-format', 'user-preference'],
    gates: ['qa:i18n-hardcoded-spine', 'qa:admin-privacy-screenshot'],
  },
  {
    tier: 'runtime-log',
    state: 'needs-review',
    copySource: 'runtime-generated-no-user-copy',
    allowHardcodedPtBrCopy: false,
    allowedLocaleTokenUseCases: ['runtime-log'],
    gates: ['qa:source-encoding', 'qa:mojibake'],
  },
]

export function buildI18nSingleSourceContract(): I18nSingleSourceContract {
  return {
    version: 1,
    canonicalSystem: 'next-i18next',
    canonicalLocaleRoot: 'cloud-web-app/web/public/locales',
    defaultLocale: 'en',
    supportedLocales: [...CANONICAL_I18N_LOCALES],
    namespace: 'common',
    premiumCopyPolicy: 'EN default; localized copy only from public/locales',
    localeTokenPolicy: 'Locale codes are allowed only for formatting, speech, or user preference metadata.',
    legacyModules: I18N_LEGACY_MODULES,
    surfacePolicies: I18N_SURFACE_POLICIES,
    prohibitedPatterns: [
      'hardcoded PT-BR user-facing copy outside public/locales',
      'new legacy translation-module imports',
      'new legacy locale-module imports',
      'mixed EN/PT labels in premium IDE, auth, landing, pricing, marketplace, or dashboard surfaces',
    ],
    nextAction: 'Keep EN premium copy canonical, route localized strings through public/locales, and delete legacy modules only after zero imports are proven.',
  }
}

export function evaluateLocaleTokenUse(input: {
  surfaceTier: I18nSurfaceTier
  useCase: LocaleTokenUseCase
  token: string
}): { state: V29OperationalState; allowed: boolean; blockers: string[]; nextAction: string } {
  const policy = I18N_SURFACE_POLICIES.find((surface) => surface.tier === input.surfaceTier)
  const isCanonicalLocale = CANONICAL_I18N_LOCALES.includes(input.token as CanonicalLocaleCode)
  const allowed = Boolean(policy?.allowedLocaleTokenUseCases.includes(input.useCase) && isCanonicalLocale)
  const blockers = [
    ...(policy ? [] : [`Unknown i18n surface tier: ${input.surfaceTier}`]),
    ...(isCanonicalLocale ? [] : [`Unsupported locale token: ${input.token}`]),
    ...(allowed || !policy ? [] : [`Locale token ${input.token} is not allowed for ${input.useCase} on ${input.surfaceTier}.`]),
  ]

  return {
    state: allowed ? 'available' : 'blocked',
    allowed,
    blockers,
    nextAction: allowed
      ? 'Locale token is technical metadata; user-facing copy must still come from public/locales.'
      : 'Move user-facing copy to public/locales or restrict this locale token to formatting/speech/user-preference metadata.',
  }
}

export function validateI18nSingleSourceContract(contract: I18nSingleSourceContract = buildI18nSingleSourceContract()): string[] {
  const failures: string[] = []
  if (contract.canonicalSystem !== 'next-i18next') failures.push('Canonical i18n system must be next-i18next.')
  if (contract.defaultLocale !== 'en') failures.push('Default locale must remain en.')
  for (const locale of CANONICAL_I18N_LOCALES) {
    if (!contract.supportedLocales.includes(locale)) failures.push(`Missing canonical locale: ${locale}`)
  }
  for (const surface of contract.surfacePolicies) {
    if (surface.allowHardcodedPtBrCopy !== false) failures.push(`${surface.tier}: hardcoded PT-BR copy must stay blocked.`)
    if (!surface.gates.length) failures.push(`${surface.tier}: missing gates.`)
  }
  for (const legacy of contract.legacyModules) {
    if (legacy.allowedImporters.length > 0) failures.push(`${legacy.modulePath}: legacy import allowlist must stay empty.`)
  }
  return failures
}
