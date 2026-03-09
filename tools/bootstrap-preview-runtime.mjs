#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const envLocalPath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local')
const envExamplePath = path.join(repoRoot, 'cloud-web-app', 'web', '.env.local.example')

function ensureLine(content, key, value, { preserveExisting = false } = {}) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}=${value}`
  if (pattern.test(content)) {
    if (preserveExisting) {
      const current = content.match(pattern)?.[0]?.slice(key.length + 1).trim()
      if (current) {
        return content
      }
    }
    return content.replace(pattern, line)
  }
  return `${content.trimEnd()}\n${line}\n`
}

if (!fs.existsSync(envExamplePath)) {
  console.error(JSON.stringify({ success: false, error: 'ENV_LOCAL_EXAMPLE_MISSING', path: envExamplePath }, null, 2))
  process.exit(1)
}

const providerArg = process.argv.find((arg) => arg.startsWith('--provider='))?.split('=')[1]?.trim() || 'e2b'
let content = fs.existsSync(envLocalPath)
  ? fs.readFileSync(envLocalPath, 'utf8')
  : fs.readFileSync(envExamplePath, 'utf8')

content = ensureLine(content, 'AETHEL_PREVIEW_PROVIDER', providerArg, { preserveExisting: true })

if (providerArg === 'e2b') {
  content = ensureLine(content, 'AETHEL_PREVIEW_PROVISION_ENDPOINT', 'https://preview-gateway.example.com/provision', {
    preserveExisting: true,
  })
  content = ensureLine(content, 'AETHEL_PREVIEW_PROVISION_TOKEN', 'replace-with-preview-token', {
    preserveExisting: true,
  })
} else if (providerArg === 'webcontainers') {
  content = ensureLine(content, 'AETHEL_PREVIEW_PROVISION_ENDPOINT', '', { preserveExisting: true })
  content = ensureLine(content, 'AETHEL_PREVIEW_PROVISION_TOKEN', '', { preserveExisting: true })
}

fs.writeFileSync(envLocalPath, content, 'utf8')

console.log(
  JSON.stringify(
    {
      success: true,
      provider: providerArg,
      path: envLocalPath,
      nextSteps:
        providerArg === 'webcontainers'
          ? [
              'Implement browser-side WebContainers runtime boot path',
              'Set NEXT_PUBLIC_PREVIEW_RUNTIME_URL if using a fixed preview runtime URL',
              'Run npm run qa:preview-runtime-readiness',
            ]
          : [
              'Replace preview endpoint/token placeholders with real values',
              'Run npm run qa:preview-runtime-readiness',
            ],
    },
    null,
    2
  )
)
