#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ADMIN_DIR = path.join(ROOT, 'app', 'admin')
const OUTPUT_FILE = path.join(ROOT, 'docs', 'ADMIN_SURFACE_SWEEP.md')

async function listAdminPages(dir) {
  const files = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listAdminPages(fullPath)))
      continue
    }
    if (entry.isFile() && entry.name === 'page.tsx') {
      files.push(fullPath)
    }
  }
  return files
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function analyze(content) {
  const hasAdminPageShell = content.includes('AdminPageShell')
  const usesAdminJsonFetch = content.includes('adminJsonFetch')
  const hasDirectFetch = /\bfetch\s*\(/.test(content)
  const hasStateRow = content.includes('AdminTableStateRow')
  const hasStatusBanner = content.includes('AdminStatusBanner')
  const hasMojibake = /Ã|â€”|�/.test(content)
  return {
    hasAdminPageShell,
    usesAdminJsonFetch,
    hasDirectFetch,
    hasStateRow,
    hasStatusBanner,
    hasMojibake,
  }
}

function rows(files) {
  return files.map(({ file, flags }) => {
    const needsShell = !flags.hasAdminPageShell ? 'yes' : 'no'
    const needsAuthFetch = flags.hasDirectFetch && !flags.usesAdminJsonFetch ? 'yes' : 'no'
    const needsTableState = flags.hasDirectFetch && !flags.hasStateRow ? 'maybe' : 'no'
    const needsStatusBanner = flags.hasDirectFetch && !flags.hasStatusBanner ? 'maybe' : 'no'
    const mojibake = flags.hasMojibake ? 'yes' : 'no'
    return `| \`${file}\` | ${needsShell} | ${needsAuthFetch} | ${needsTableState} | ${needsStatusBanner} | ${mojibake} |`
  })
}

async function main() {
  const now = new Date().toISOString()
  const pageFiles = await listAdminPages(ADMIN_DIR)
  const analysis = []

  for (const filePath of pageFiles) {
    const content = await fs.readFile(filePath, 'utf8')
    analysis.push({
      file: rel(filePath),
      flags: analyze(content),
    })
  }

  const shellMissing = analysis.filter((item) => !item.flags.hasAdminPageShell)
  const authFetchMissing = analysis.filter((item) => item.flags.hasDirectFetch && !item.flags.usesAdminJsonFetch)
  const mojibakeCandidates = analysis.filter((item) => item.flags.hasMojibake)

  const lines = []
  lines.push('# Admin Surface Sweep')
  lines.push('')
  lines.push(`- Generated at: \`${now}\``)
  lines.push(`- Files scanned: \`${analysis.length}\``)
  lines.push(`- Missing \`AdminPageShell\`: \`${shellMissing.length}\``)
  lines.push(`- Direct \`fetch(...)\` without \`adminJsonFetch\`: \`${authFetchMissing.length}\``)
  lines.push(`- Mojibake candidates: \`${mojibakeCandidates.length}\``)
  lines.push('')
  lines.push('## Detailed Matrix')
  lines.push('')
  lines.push('| File | Missing shell | Missing admin auth fetch | Missing table state row | Missing status banner | Mojibake candidate |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  lines.push(...rows(analysis))
  lines.push('')
  lines.push('## Policy')
  lines.push('')
  lines.push('- Critical admin surfaces should converge to `AdminPageShell` + `adminJsonFetch` + explicit state rows.')
  lines.push('- Pages marked as mojibake candidates must be reviewed and normalized before freeze.')
  lines.push('- This report is advisory and does not block CI by default.')
  lines.push('')

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, `${lines.join('\n')}\n`, 'utf8')

  console.log(
    `ADMIN_SURFACE_SWEEP_OK missing_shell=${shellMissing.length} missing_admin_auth_fetch=${authFetchMissing.length} mojibake_candidates=${mojibakeCandidates.length}`,
  )
}

main().catch((error) => {
  console.error('ADMIN_SURFACE_SWEEP_FAILED', error)
  process.exit(1)
})

