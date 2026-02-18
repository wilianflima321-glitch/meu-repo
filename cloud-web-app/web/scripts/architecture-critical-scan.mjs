#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT_FILE = path.join(ROOT, 'docs', 'ARCHITECTURE_CRITICAL_TRIAGE.md')

async function exists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function listFiles(dir, exts = ['.ts', '.tsx']) {
  const out = []
  if (!(await exists(dir))) return out
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await listFiles(abs, exts)))
      continue
    }
    if (exts.some((ext) => abs.endsWith(ext))) out.push(abs)
  }
  return out
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

async function countByRegex(files, regex, { exclude } = {}) {
  let count = 0
  const byFile = new Map()
  for (const file of files) {
    if (exclude && exclude.test(file)) continue
    const content = await fs.readFile(file, 'utf8')
    const matches = content.match(regex)
    if (!matches) continue
    count += matches.length
    byFile.set(rel(file), matches.length)
  }
  return { count, byFile }
}

function topFiles(map, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

async function detectUnreferencedCandidates(candidates, searchableFiles) {
  const result = []
  const contents = await Promise.all(
    searchableFiles.map(async (file) => ({ file, content: await fs.readFile(file, 'utf8') }))
  )

  for (const candidate of candidates) {
    const baseName = path.basename(candidate, path.extname(candidate))
    const markerRegex = new RegExp(`\\b${baseName}\\b|${rel(candidate).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    const hasReference = contents.some(({ file, content }) => {
      if (file === candidate) return false
      return markerRegex.test(content)
    })
    result.push({ file: rel(candidate), referenced: hasReference })
  }
  return result
}

async function main() {
  const now = new Date().toISOString()
  const appFiles = await listFiles(path.join(ROOT, 'app'))
  const componentFiles = await listFiles(path.join(ROOT, 'components'))
  const libFiles = await listFiles(path.join(ROOT, 'lib'))
  const hookFiles = await listFiles(path.join(ROOT, 'hooks'))
  const allFiles = [...appFiles, ...componentFiles, ...libFiles, ...hookFiles]

  const routeFiles = appFiles.filter((f) => /[/\\]app[/\\]api[/\\].*[/\\]route\.ts$/.test(f))
  const deprecatedComponents = componentFiles.filter((f) => f.includes(`${path.sep}_deprecated${path.sep}`))

  const fileCompatUsage = await countByRegex(
    [...appFiles, ...componentFiles, ...libFiles, ...hookFiles],
    /\/api\/files\/(read|write|list|create|delete|move|copy|rename)\b/g,
    { exclude: /[/\\]app[/\\]api[/\\]/ }
  )

  const workspaceDeprecatedUsage = await countByRegex(
    [...appFiles, ...componentFiles, ...libFiles, ...hookFiles],
    /\/api\/workspace\/(tree|files)\b/g,
    {
      exclude: /[/\\]app[/\\]api[/\\]|[/\\]lib[/\\]server[/\\]compatibility-route-telemetry\.ts$/,
    }
  )

  const redirectAliases = await countByRegex(
    appFiles.filter((f) => /[/\\]app[/\\].*[/\\]page\.tsx$/.test(f)),
    /redirect\('\/ide\?entry=/g
  )

  const notImplementedApi = await countByRegex(routeFiles, /\bNOT_IMPLEMENTED\b/g)
  const fileCompatWrappers = await countByRegex(
    routeFiles.filter((f) => f.includes(`${path.sep}app${path.sep}api${path.sep}files${path.sep}`)),
    /trackCompatibilityRouteHit\(/g
  )

  const unreferencedCandidates = await detectUnreferencedCandidates(
    [
      path.join(ROOT, 'components', 'editor', 'MonacoEditor.tsx'),
    ],
    [...appFiles, ...componentFiles, ...libFiles, ...hookFiles]
  )

  const lines = []
  lines.push('# ARCHITECTURE_CRITICAL_TRIAGE')
  lines.push('')
  lines.push(`- Generated at: \`${now}\``)
  lines.push(`- Scope: \`app/\`, \`components/\`, \`lib/\`, \`hooks/\``)
  lines.push('')
  lines.push('## Core Metrics')
  lines.push('')
  lines.push(`- API route files: **${routeFiles.length}**`)
  lines.push(`- Deprecated component files (` + '`components/_deprecated/*`' + `): **${deprecatedComponents.length}**`)
  lines.push(`- Frontend usage of file compatibility routes (` + '`/api/files/read|write|list|...`' + `): **${fileCompatUsage.count}**`)
  lines.push(`- Frontend usage of deprecated workspace routes (` + '`/api/workspace/*`' + `): **${workspaceDeprecatedUsage.count}**`)
  lines.push(`- Redirect alias pages to \`/ide?entry=\`: **${redirectAliases.count}**`)
  lines.push(`- API NOT_IMPLEMENTED markers (` + '`app/api/**/route.ts`' + `): **${notImplementedApi.count}**`)
  lines.push(`- File API compatibility wrappers (` + '`trackCompatibilityRouteHit`' + ` in ` + '`app/api/files/*`' + `): **${fileCompatWrappers.count}**`)
  lines.push('')
  lines.push('## Top Compatibility Call Sites')
  lines.push('')
  lines.push('### `/api/files/read|write|list|...` usage')
  lines.push('')
  lines.push('| File | Matches |')
  lines.push('| --- | ---: |')
  for (const [file, count] of topFiles(fileCompatUsage.byFile)) {
    lines.push(`| \`${file}\` | ${count} |`)
  }
  lines.push('')
  lines.push('### `/api/workspace/*` usage outside route handlers')
  lines.push('')
  lines.push('| File | Matches |')
  lines.push('| --- | ---: |')
  for (const [file, count] of topFiles(workspaceDeprecatedUsage.byFile)) {
    lines.push(`| \`${file}\` | ${count} |`)
  }
  lines.push('')
  lines.push('## Unreferenced Candidate Check')
  lines.push('')
  lines.push('| File | Referenced |')
  lines.push('| --- | --- |')
  for (const item of unreferencedCandidates) {
    lines.push(`| \`${item.file}\` | ${item.referenced ? 'yes' : 'no'} |`)
  }
  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- Compatibility routes can be intentional, but should have a time-boxed removal plan.')
  lines.push('- Unreferenced candidates should be confirmed and removed or moved to `_deprecated`.')
  lines.push('- This report is informational and does not replace enterprise gate checks.')
  lines.push('')

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, `${lines.join('\n')}\n`, 'utf8')

  console.log(
    `ARCHITECTURE_CRITICAL_TRIAGE_OK apiRoutes=${routeFiles.length}, deprecatedComponents=${deprecatedComponents.length}, fileCompatUsage=${fileCompatUsage.count}, redirectAliases=${redirectAliases.count}, apiNotImplemented=${notImplementedApi.count}, fileCompatWrappers=${fileCompatWrappers.count}`
  )
}

main().catch((error) => {
  console.error('ARCHITECTURE_CRITICAL_TRIAGE_FAILED', error)
  process.exit(1)
})
