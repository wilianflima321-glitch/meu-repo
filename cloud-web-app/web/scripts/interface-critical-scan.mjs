#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components'].map((p) => path.join(ROOT, p))
const OUTPUT_FILE = path.join(ROOT, 'docs', 'INTERFACE_CRITICAL_SWEEP.md')

const METRICS = [
  {
    id: 'legacy-accent-tokens',
    label: 'Legacy accent tokens (violet/purple/indigo/pink)',
    regex: /\b(from-violet|from-purple|fuchsia|pink|bg-purple|text-purple|ring-violet|ring-purple|indigo-)\b/g,
    severity: 'high',
  },
  {
    id: 'admin-light-theme-tokens',
    label: 'Admin light-theme tokens (bg-white/text-gray/border-gray)',
    regex: /\b(bg-white|text-gray-\d+|border-gray-\d+)\b/g,
    severity: 'high',
    include: /[/\\]app[/\\]admin[/\\].+\.tsx$/,
  },
  {
    id: 'admin-status-light-tokens',
    label: 'Admin light status tokens (100-level bg/text + light borders)',
    regex: /\b(bg-(green|yellow|red|blue)-100|text-(green|yellow|red|blue)-[78]00|border-(green|yellow|red|blue)-400)\b/g,
    severity: 'high',
    include: /[/\\]app[/\\]admin[/\\].+\.tsx$/,
  },
  {
    id: 'blocking-browser-dialogs',
    label: 'Blocking browser dialogs (window.prompt/window.confirm)',
    regex: /\bwindow\.(prompt|confirm)\s*\(/g,
    severity: 'medium',
  },
  {
    id: 'not-implemented-ui',
    label: 'Explicit NOT_IMPLEMENTED UI states',
    regex: /\bNOT_IMPLEMENTED\b/g,
    severity: 'info',
    exclude: /[/\\]app[/\\]api[/\\]ai[/\\](query|stream)[/\\]route\.ts$/,
  },
  {
    id: 'not-implemented-noncritical',
    label: 'Explicit NOT_IMPLEMENTED non-critical AI surfaces (tracked)',
    regex: /\bNOT_IMPLEMENTED\b/g,
    severity: 'info',
    include: /[/\\]app[/\\]api[/\\]ai[/\\](query|stream)[/\\]route\.ts$/,
  },
  {
    id: 'deprecated-surface-usage',
    label: 'Deprecated surface references (_deprecated)',
    regex: /_deprecated/g,
    severity: 'medium',
  },
  {
    id: 'frontend-workspace-route-usage',
    label: 'Frontend usage of deprecated workspace routes (/api/workspace/*)',
    regex: /\/api\/workspace\/(tree|files)\b/g,
    severity: 'high',
    exclude: /[/\\]app[/\\]api[/\\].+\.(ts|tsx)$/,
  },
  {
    id: 'legacy-editor-shell-usage',
    label: 'Legacy editor shell route usage (/editor?file=)',
    regex: /\/editor\?file=/g,
    severity: 'high',
  },
]

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function listFiles(dirPath) {
  const files = []
  if (!(await exists(dirPath))) return files
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)))
      continue
    }
    if (entry.isFile() && (full.endsWith('.tsx') || full.endsWith('.ts'))) {
      files.push(full)
    }
  }
  return files
}

function normalizePath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function countMatches(content, regex) {
  const re = new RegExp(regex.source, regex.flags)
  let count = 0
  while (re.exec(content)) count += 1
  return count
}

function getTopFiles(byFile, top = 20) {
  return [...byFile.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
}

async function main() {
  const files = (await Promise.all(TARGET_DIRS.map(listFiles))).flat()
  const scannedFiles = files.map(normalizePath)
  const now = new Date().toISOString()

  const metricResults = METRICS.map((metric) => {
    const byFile = new Map()
    let total = 0

    for (const absPath of files) {
      const relPath = normalizePath(absPath)
      if (metric.include && !metric.include.test(absPath)) continue
      if (metric.exclude && metric.exclude.test(absPath)) continue
      byFile.set(relPath, 0)
    }

    return {
      ...metric,
      total,
      byFile,
      topFiles: [],
    }
  })

  for (const absPath of files) {
    const content = await fs.readFile(absPath, 'utf8')
    const relPath = normalizePath(absPath)
    for (const metric of metricResults) {
      if (metric.include && !metric.include.test(absPath)) continue
      if (metric.exclude && metric.exclude.test(absPath)) continue
      const count = countMatches(content, metric.regex)
      if (count === 0) continue
      metric.total += count
      metric.byFile.set(relPath, (metric.byFile.get(relPath) || 0) + count)
    }
  }

  for (const metric of metricResults) {
    metric.topFiles = getTopFiles(metric.byFile, 20)
  }

  const lines = []
  lines.push('# Interface Critical Sweep')
  lines.push('')
  lines.push(`- Generated at: \`${now}\``)
  lines.push(`- Scope: \`app/\`, \`components/\``)
  lines.push(`- Files scanned: \`${scannedFiles.length}\``)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  for (const metric of metricResults) {
    lines.push(`- \`${metric.id}\` (${metric.severity}): ${metric.total}`)
  }
  lines.push('')

  for (const metric of metricResults) {
    lines.push(`## ${metric.label}`)
    lines.push('')
    lines.push(`- Metric ID: \`${metric.id}\``)
    lines.push(`- Severity: \`${metric.severity}\``)
    lines.push(`- Total matches: \`${metric.total}\``)
    lines.push('')
    if (metric.topFiles.length === 0) {
      lines.push('- No matches')
      lines.push('')
      continue
    }
    lines.push('| File | Matches |')
    lines.push('| --- | ---: |')
    for (const [file, count] of metric.topFiles) {
      lines.push(`| \`${file}\` | ${count} |`)
    }
    lines.push('')
  }

  lines.push('## Execution Policy')
  lines.push('')
  lines.push('- High severity metrics must be reduced before release candidates.')
  lines.push('- Medium severity metrics must have owner + ETA in the execution contract.')
  lines.push('- INFO metrics remain explicit but must stay accurate to runtime behavior.')
  lines.push('')

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true })
  await fs.writeFile(OUTPUT_FILE, `${lines.join('\n')}\n`, 'utf8')

  const summary = metricResults.map((m) => `${m.id}=${m.total}`).join(', ')
  console.log(`INTERFACE_CRITICAL_SWEEP_OK ${summary}`)
}

main().catch((error) => {
  console.error('INTERFACE_CRITICAL_SWEEP_FAILED', error)
  process.exit(1)
})
