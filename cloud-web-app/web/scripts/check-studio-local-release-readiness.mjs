#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'lib/studio-local/release-manifest.ts',
  'lib/studio-local/release-signing-readiness.ts',
  'components/studio/StudioLocalReleaseReadinessMatrix.tsx',
  'components/studio/StudioLocalRuntimeCapsule.tsx',
  'app/download/page.tsx',
  'docs/STUDIO_LOCAL_RELEASE_READINESS_V22.md',
]

const failures = []
function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    failures.push(`${file}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

const sources = Object.fromEntries(REQUIRED_FILES.map((file) => [file, read(file)]))
function requireToken(file, token, reason = token) {
  if (!sources[file]?.includes(token)) failures.push(`${file}: missing ${reason}`)
}

for (const id of [
  'windows-installer',
  'macos-notarized-dmg',
  'linux-appimage-deb',
  'signed-installers',
  'auto-updater',
  'sidecar-health',
  'capability-probe',
  'cloud-stream-handoff',
]) {
  requireToken('lib/studio-local/release-manifest.ts', id)
}

requireToken('lib/studio-local/release-manifest.ts', "signedInstallers: 'held'", 'signed installers held')
requireToken('lib/studio-local/release-manifest.ts', 'buildStudioLocalSigningReadiness', 'signing readiness summary')
requireToken('lib/studio-local/release-manifest.ts', 'getStudioLocalReleaseReadinessSummary')
requireToken('lib/studio-local/release-manifest.ts', 'Public release remains held')
requireToken('lib/studio-local/release-manifest.ts', 'No public signed artifact evidence')
requireToken('lib/studio-local/release-manifest.ts', 'NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL')
requireToken('lib/studio-local/release-signing-readiness.ts', 'Windows Azure Artifact Signing or EV/OV signing evidence', 'Windows signing evidence')
requireToken('lib/studio-local/release-signing-readiness.ts', 'macOS notarization and staple evidence', 'macOS notarization evidence')
requireToken('lib/studio-local/release-signing-readiness.ts', 'Tauri updater artifacts, public key, HTTPS endpoint, and rollback channel', 'updater evidence')
requireToken('lib/studio-local/release-signing-readiness.ts', 'signedInstallerClaimAllowed', 'signed installer claim guard')
requireToken('lib/studio-local/release-signing-readiness.ts', 'publicInstallerEligible', 'public installer eligibility guard')
requireToken('components/studio/StudioLocalReleaseReadinessMatrix.tsx', 'Request beta only')
requireToken('components/studio/StudioLocalReleaseReadinessMatrix.tsx', 'Windows, macOS, Linux, updater, signing, sidecars')
requireToken('components/studio/StudioLocalReleaseReadinessMatrix.tsx', 'Studio Local release readiness matrix')
requireToken('components/studio/StudioLocalReleaseReadinessMatrix.tsx', 'Signing chain:', 'signing chain disclosure')
requireToken('components/studio/StudioLocalRuntimeCapsule.tsx', 'getStudioLocalReleaseReadinessSummary')
requireToken('components/studio/StudioLocalRuntimeCapsule.tsx', 'Signed installers stay held')
requireToken('app/download/page.tsx', 'StudioLocalReleaseReadinessMatrix')
requireToken('app/download/page.tsx', 'Request desktop beta')
requireToken('docs/STUDIO_LOCAL_RELEASE_READINESS_V22.md', 'No broken download theater')
requireToken('docs/STUDIO_LOCAL_RELEASE_READINESS_V22.md', 'signed installers')
requireToken('docs/STUDIO_LOCAL_RELEASE_READINESS_V22.md', 'auto-updater')
requireToken('docs/STUDIO_LOCAL_RELEASE_READINESS_V22.md', 'Cloud Stream handoff')

const download = sources['app/download/page.tsx'] ?? ''
if (/href=\{current\.artifact\}|href=\{`.*artifact/.test(download)) {
  failures.push('app/download/page.tsx: must not link directly to unsigned artifact names')
}

if (failures.length > 0) {
  console.error(`[studio-local-release-readiness] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-local-release-readiness] PASS matrix=download+studio signed-installers=held')
