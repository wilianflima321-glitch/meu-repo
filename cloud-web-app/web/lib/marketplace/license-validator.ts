export const MARKETPLACE_ALLOWED_LICENSES = [
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'MIT',
  'Apache-2.0',
  'BSD-3-Clause',
  'aethel-creator-license-v1',
] as const

export const MARKETPLACE_BLOCKED_LICENSES = [
  'GPL-3.0',
  'AGPL-3.0',
  'LGPL-3.0',
  'CC-BY-NC-4.0',
  'CC-BY-ND-4.0',
  'unknown',
] as const

export type MarketplaceAllowedLicense = (typeof MARKETPLACE_ALLOWED_LICENSES)[number]
export type MarketplaceBlockedLicense = (typeof MARKETPLACE_BLOCKED_LICENSES)[number]
export type MarketplaceAssetLicense = MarketplaceAllowedLicense | MarketplaceBlockedLicense | 'proprietary-owned'

export type LicenseValidationInput = {
  license?: string | null
  commercialUse?: boolean
  redistribution?: boolean
  proofUrl?: string | null
}

export type LicenseValidationDecision = {
  allowed: boolean
  normalizedLicense: MarketplaceAssetLicense
  attributionRequired: boolean
  shareAlikeRequired: boolean
  proofRequired: boolean
  blockers: string[]
  warnings: string[]
}

const LICENSE_ALIASES = new Map<string, MarketplaceAssetLicense>([
  ['cc0', 'CC0-1.0'],
  ['cc0-1.0', 'CC0-1.0'],
  ['creative-commons-zero', 'CC0-1.0'],
  ['cc-by', 'CC-BY-4.0'],
  ['cc-by-4.0', 'CC-BY-4.0'],
  ['cc-by-sa', 'CC-BY-SA-4.0'],
  ['cc-by-sa-4.0', 'CC-BY-SA-4.0'],
  ['cc-by-nc', 'CC-BY-NC-4.0'],
  ['cc-by-nc-4.0', 'CC-BY-NC-4.0'],
  ['cc-by-nd', 'CC-BY-ND-4.0'],
  ['cc-by-nd-4.0', 'CC-BY-ND-4.0'],
  ['mit', 'MIT'],
  ['apache', 'Apache-2.0'],
  ['apache-2.0', 'Apache-2.0'],
  ['bsd-3', 'BSD-3-Clause'],
  ['bsd-3-clause', 'BSD-3-Clause'],
  ['gpl', 'GPL-3.0'],
  ['gpl-3.0', 'GPL-3.0'],
  ['agpl', 'AGPL-3.0'],
  ['agpl-3.0', 'AGPL-3.0'],
  ['lgpl', 'LGPL-3.0'],
  ['lgpl-3.0', 'LGPL-3.0'],
  ['aethel', 'aethel-creator-license-v1'],
  ['aethel-creator-license-v1', 'aethel-creator-license-v1'],
  ['owned', 'proprietary-owned'],
  ['self-owned', 'proprietary-owned'],
  ['proprietary-owned', 'proprietary-owned'],
  ['unknown', 'unknown'],
])

function normalizeLicense(value: string | null | undefined): MarketplaceAssetLicense {
  const key = String(value ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')

  return LICENSE_ALIASES.get(key) ?? 'unknown'
}

function isAllowedLicense(license: MarketplaceAssetLicense): license is MarketplaceAllowedLicense {
  return MARKETPLACE_ALLOWED_LICENSES.includes(license as MarketplaceAllowedLicense)
}

export function validateMarketplaceAssetLicense(input: LicenseValidationInput): LicenseValidationDecision {
  const normalizedLicense = normalizeLicense(input.license)
  const commercialUse = input.commercialUse !== false
  const redistribution = input.redistribution !== false
  const blockers: string[] = []
  const warnings: string[] = []
  const attributionRequired = normalizedLicense === 'CC-BY-4.0' || normalizedLicense === 'CC-BY-SA-4.0'
  const shareAlikeRequired = normalizedLicense === 'CC-BY-SA-4.0'
  const proofRequired = normalizedLicense === 'proprietary-owned'

  if (normalizedLicense === 'unknown') {
    blockers.push('Asset license is unknown; marketplace publication requires a declared license.')
  } else if (!isAllowedLicense(normalizedLicense) && normalizedLicense !== 'proprietary-owned') {
    blockers.push(`License ${normalizedLicense} is blocked for marketplace redistribution.`)
  }

  if (commercialUse && normalizedLicense === 'CC-BY-NC-4.0') {
    blockers.push('CC-BY-NC-4.0 blocks commercial use.')
  }

  if (redistribution && normalizedLicense === 'CC-BY-ND-4.0') {
    blockers.push('CC-BY-ND-4.0 blocks derivative redistribution.')
  }

  if (proofRequired && !input.proofUrl) {
    blockers.push('Owned/proprietary assets require proof of ownership before marketplace publication.')
  }

  if (attributionRequired) warnings.push('Attribution must be displayed on the asset listing and license report.')
  if (shareAlikeRequired) warnings.push('Derivative assets must preserve share-alike license obligations.')

  return {
    allowed: blockers.length === 0,
    normalizedLicense,
    attributionRequired,
    shareAlikeRequired,
    proofRequired,
    blockers,
    warnings,
  }
}

