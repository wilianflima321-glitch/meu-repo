#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnMissing = args.includes('--fail-on-missing')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null

const repoRoot = process.cwd()
const knownTopLevelDirs = fs
  .readdirSync(repoRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== '.git')
  .map((entry) => entry.name)

function countMarkdownFiles(baseDir) {
  let total = 0
  const stack = [baseDir]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolute)
        continue
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        total += 1
      }
    }
  }
  return total
}

function normalizeCandidate(raw) {
  if (!raw) return ''
  return raw
    .trim()
    .replace(/^['"`]/, '')
    .replace(/['"`]$/, '')
    .replace(/[;,)]$/, '')
    .replace(/^\.\//, '')
}

function looksLikeTemplateToken(value) {
  return value.includes('${{') || value.includes('$(')
}

function existsRelative(relativePath) {
  return fs.existsSync(path.resolve(repoRoot, relativePath))
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

const checks = []
const seen = new Set()
const deadScriptRefs = []
const deadScriptSeen = new Set()

function addCheck({ source, key, target, optional = false, reason = '' }) {
  const normalized = normalizeCandidate(target)
  if (!normalized || looksLikeTemplateToken(normalized)) return

  const dedupeKey = `${source}::${key}::${normalized}::${optional ? 'optional' : 'required'}`
  if (seen.has(dedupeKey)) return
  seen.add(dedupeKey)

  checks.push({
    source,
    key,
    target: normalized,
    optional,
    reason,
    exists: existsRelative(normalized),
  })
}

function extractPathMatches(command, regex) {
  const matches = []
  let match
  while ((match = regex.exec(command)) !== null) {
    const candidate = normalizeCandidate(match[1] || '')
    if (candidate) matches.push(candidate)
  }
  return matches
}

function normalizeScriptName(raw) {
  if (!raw) return ''
  return normalizeCandidate(raw).replace(/^npm\s+run\s+/i, '').trim()
}

function readScriptsFromPackage(relativeDir) {
  const packageJsonPath = path.resolve(repoRoot, relativeDir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) return null
  const pkg = readJson(packageJsonPath)
  return new Set(Object.keys(pkg.scripts || {}))
}

function addDeadScriptRef({
  source,
  sourceScript,
  commandType,
  targetScript,
  targetPackage = '.',
  reason = '',
}) {
  const normalizedTargetScript = normalizeScriptName(targetScript)
  if (!normalizedTargetScript) return
  const normalizedTargetPackage = normalizeCandidate(targetPackage || '.')
  const key = [
    source,
    sourceScript,
    commandType,
    normalizedTargetScript,
    normalizedTargetPackage || '.',
  ].join('::')
  if (deadScriptSeen.has(key)) return
  deadScriptSeen.add(key)
  deadScriptRefs.push({
    source,
    sourceScript,
    commandType,
    targetScript: normalizedTargetScript,
    targetPackage: normalizedTargetPackage || '.',
    reason,
  })
}

function scriptContainsGuard(scriptCommand, targetPath) {
  const single = `fs.existsSync('${targetPath}')`
  const double = `fs.existsSync(\"${targetPath}\")`
  const singlePkg = `fs.existsSync('${targetPath}/package.json')`
  const doublePkg = `fs.existsSync(\"${targetPath}/package.json\")`
  const bracket = `[ -f \"${targetPath}\" ]`
  const bracketPkg = `[ -f \"${targetPath}/package.json\" ]`
  const packageGuard = `const p='${targetPath}'`
  const packageGuardDouble = `const p=\"${targetPath}\"`
  const packageJsonGuard = `const p='${targetPath}/package.json'`
  const packageJsonGuardDouble = `const p=\"${targetPath}/package.json\"`
  return (
    scriptCommand.includes(single) ||
    scriptCommand.includes(double) ||
    scriptCommand.includes(singlePkg) ||
    scriptCommand.includes(doublePkg) ||
    scriptCommand.includes(bracket) ||
    scriptCommand.includes(bracketPkg) ||
    scriptCommand.includes(packageGuard) ||
    scriptCommand.includes(packageGuardDouble) ||
    scriptCommand.includes(packageJsonGuard) ||
    scriptCommand.includes(packageJsonGuardDouble)
  )
}

function scanPackageScripts() {
  const pkgPath = path.join(repoRoot, 'package.json')
  if (!fs.existsSync(pkgPath)) return
  const pkg = readJson(pkgPath)
  const scripts = pkg.scripts || {}
  const rootScriptNames = new Set(Object.keys(scripts))

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string') continue

    const cdMatches = extractPathMatches(command, /(?:^|[;&|]\s*|&&\s*|\|\|\s*)cd\s+([^\s;&|]+)/g)
    for (const match of cdMatches) {
      addCheck({
        source: 'package.json',
        key: `scripts.${name}`,
        target: match,
        optional: scriptContainsGuard(command, match),
        reason: scriptContainsGuard(command, match) ? 'guarded_by_exists_sync' : '',
      })
    }

    const prefixMatches = extractPathMatches(command, /npm\s+--prefix\s+([^\s;&|]+)/g)
    for (const match of prefixMatches) {
      addCheck({
        source: 'package.json',
        key: `scripts.${name}`,
        target: match,
        optional: scriptContainsGuard(command, match),
        reason: scriptContainsGuard(command, match) ? 'guarded_by_exists_sync' : '',
      })
    }

    const nodeFileMatches = extractPathMatches(command, /node\s+([^\s'"`;&|]+(?:\.c?m?js|\.ts))/g)
    for (const match of nodeFileMatches) {
      addCheck({ source: 'package.json', key: `scripts.${name}`, target: match })
    }

    const tsconfigMatches = extractPathMatches(command, /-p\s+([^\s'"`;&|]+tsconfig\.json)/g)
    for (const match of tsconfigMatches) {
      addCheck({
        source: 'package.json',
        key: `scripts.${name}`,
        target: match,
        optional: scriptContainsGuard(command, match),
        reason: scriptContainsGuard(command, match) ? 'guarded_by_exists_sync' : '',
      })
    }

    const prefixRunRegex = /(?:^|[;&|]\s*|&&\s*|\|\|\s*)npm\s+--prefix\s+([^\s;&|]+)\s+run\s+([^\s;&|]+)/g
    let prefixRunMatch
    while ((prefixRunMatch = prefixRunRegex.exec(command)) !== null) {
      const packageDir = normalizeCandidate(prefixRunMatch[1])
      const scriptName = normalizeScriptName(prefixRunMatch[2])
      if (!packageDir || !scriptName) continue
      if (!existsRelative(packageDir)) continue
      const targetScripts = readScriptsFromPackage(packageDir)
      if (!targetScripts || !targetScripts.has(scriptName)) {
        addDeadScriptRef({
          source: 'package.json',
          sourceScript: name,
          commandType: 'npm--prefix-run',
          targetScript: scriptName,
          targetPackage: packageDir,
          reason: targetScripts ? 'missing_script_in_target_package' : 'missing_target_package_json',
        })
      }
    }

    const localRunRegex = /(?:^|[;&|]\s*|&&\s*|\|\|\s*)npm\s+run\s+([^\s;&|]+)/g
    let localRunMatch
    while ((localRunMatch = localRunRegex.exec(command)) !== null) {
      const scriptName = normalizeScriptName(localRunMatch[1])
      if (!scriptName) continue
      if (!rootScriptNames.has(scriptName)) {
        addDeadScriptRef({
          source: 'package.json',
          sourceScript: name,
          commandType: 'npm-run',
          targetScript: scriptName,
          targetPackage: '.',
          reason: 'missing_script_in_root_package',
        })
      }
    }
  }
}

function scanTsconfigReferences() {
  const tsconfigPath = path.join(repoRoot, 'tsconfig.json')
  if (!fs.existsSync(tsconfigPath)) return

  const tsconfig = readJson(tsconfigPath)
  const refs = Array.isArray(tsconfig.references) ? tsconfig.references : []
  for (const ref of refs) {
    if (!ref || typeof ref.path !== 'string') continue
    addCheck({ source: 'tsconfig.json', key: 'references', target: ref.path })
  }
}

function scanGitmodules() {
  const gitmodulesPath = path.join(repoRoot, '.gitmodules')
  if (!fs.existsSync(gitmodulesPath)) return
  const content = fs.readFileSync(gitmodulesPath, 'utf8')
  const regex = /^\s*path\s*=\s*(.+)$/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    addCheck({ source: '.gitmodules', key: 'path', target: match[1] })
  }
}

function scanWorkflows() {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows')
  if (!fs.existsSync(workflowsDir)) return

  for (const fileName of fs.readdirSync(workflowsDir)) {
    if (!fileName.endsWith('.yml') && !fileName.endsWith('.yaml')) continue
    const fullPath = path.join(workflowsDir, fileName)
    const content = fs.readFileSync(fullPath, 'utf8')

    const workingDirRegex = /^\s*working-directory:\s*(.+)$/gm
    let wdMatch
    while ((wdMatch = workingDirRegex.exec(content)) !== null) {
      addCheck({ source: `.github/workflows/${fileName}`, key: 'working-directory', target: wdMatch[1] })
    }

    const runNodeRegex = /node\s+([^\s'"`;&|]+(?:\.c?m?js|\.ts))/g
    let nodeMatch
    while ((nodeMatch = runNodeRegex.exec(content)) !== null) {
      const candidate = normalizeCandidate(nodeMatch[1])
      if (!candidate || candidate.startsWith('./')) continue
      const topFolder = candidate.split('/')[0]
      if (!knownTopLevelDirs.includes(topFolder)) continue
      addCheck({ source: `.github/workflows/${fileName}`, key: 'run-node', target: candidate })
    }

    const psFileRegex = /-File\s+([^\s'"`;&|]+)/g
    let psMatch
    while ((psMatch = psFileRegex.exec(content)) !== null) {
      addCheck({ source: `.github/workflows/${fileName}`, key: 'run-powershell-file', target: psMatch[1] })
    }
  }
}

scanPackageScripts()
scanTsconfigReferences()
scanGitmodules()
scanWorkflows()

const requiredMissing = checks.filter((check) => !check.exists && !check.optional)
const optionalMissing = checks.filter((check) => !check.exists && check.optional)
const resolved = checks.filter((check) => check.exists)

function topLevelFolder(target) {
  const normalized = target.replace(/\\/g, '/')
  return normalized.split('/')[0]
}

const topDirs = [...knownTopLevelDirs].sort((a, b) => a.localeCompare(b))

const refsByTopDir = new Map(topDirs.map((dir) => [dir, 0]))
for (const check of checks) {
  const top = topLevelFolder(check.target)
  if (refsByTopDir.has(top)) {
    refsByTopDir.set(top, (refsByTopDir.get(top) || 0) + 1)
  }
}

const classificationOverrides = {
  'audit dicas do emergent usar': 'ACTIVE',
  client: 'ACTIVE',
  'cloud-admin-ia': 'LEGACY_ACTIVE',
  diagnostics: 'ACTIVE',
  docs: 'ACTIVE',
  infra: 'ACTIVE',
  'infra-playwright-ci-agent': 'LEGACY_ACTIVE',
  installers: 'LEGACY_ACTIVE',
  'meu-repo': 'EXTERNAL_ONLY',
  nginx: 'ACTIVE',
  public: 'ACTIVE',
  'runtime-templates': 'ACTIVE',
  scripts: 'ACTIVE',
  shared: 'ACTIVE',
  tests: 'ACTIVE',
  'visual-regression.spec.ts-snapshots': 'LEGACY_ACTIVE',
}

function classifyDirectory(dirName, references) {
  if (classificationOverrides[dirName]) return classificationOverrides[dirName]
  if (references > 0) return 'ACTIVE'
  if (dirName.startsWith('.')) return 'ACTIVE'
  return 'ORPHAN_CANDIDATE'
}

const directoryMatrix = topDirs.map((dir) => {
  const references = refsByTopDir.get(dir) || 0
  return {
    directory: dir,
    references,
    classification: classifyDirectory(dir, references),
  }
})

const summary = {
  generatedAt: new Date().toISOString(),
  totalChecks: checks.length,
  resolved: resolved.length,
  requiredMissing: requiredMissing.length,
  optionalMissing: optionalMissing.length,
  deadScriptReferences: deadScriptRefs.length,
  markdownTotal: countMarkdownFiles(repoRoot),
  markdownCanonical: countMarkdownFiles(path.join(repoRoot, 'audit dicas do emergent usar')),
}
summary.markdownHistorical = summary.markdownTotal - summary.markdownCanonical

const surfaceOwners = [
  { surface: 'dashboard', owner: 'Frontend Lead Studio Home', paths: 'cloud-web-app/web/app/dashboard/*, cloud-web-app/web/components/studio/*' },
  { surface: 'ide', owner: 'Frontend Lead IDE', paths: 'cloud-web-app/web/app/ide/*, cloud-web-app/web/components/ide/*' },
  { surface: 'admin', owner: 'Product Ops + Backend', paths: 'cloud-web-app/web/app/admin/*, cloud-web-app/web/app/api/admin/*' },
  { surface: 'api', owner: 'Backend Lead API', paths: 'cloud-web-app/web/app/api/*' },
  { surface: 'ai', owner: 'AI Architect', paths: 'cloud-web-app/web/app/api/ai/*, cloud-web-app/web/lib/ai*' },
  { surface: 'billing', owner: 'Billing/Entitlement Lead', paths: 'cloud-web-app/web/app/api/billing/*, cloud-web-app/web/app/api/admin/payments/*' },
  { surface: 'governance', owner: 'PM Tecnico + Plataforma', paths: 'package.json, .github/workflows/*, tools/repo-connectivity-scan.mjs' },
]

function rowForCheck(check) {
  return `| ${check.source} | ${check.key} | \`${check.target}\` | ${check.exists ? 'present' : check.optional ? 'missing_optional' : 'missing_required'} | ${check.reason || '-'} |`
}

function matrixRow(entry) {
  return `| \`${entry.directory}\` | ${entry.references} | ${entry.classification} |`
}

const markdown = [
  '# 25_REPO_CONNECTIVITY_MATRIX_2026-02-20',
  'Status: GENERATED CONNECTIVITY SWEEP',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  `- Total checks: ${summary.totalChecks}`,
  `- Resolved references: ${summary.resolved}`,
  `- Missing required references: ${summary.requiredMissing}`,
  `- Missing optional references: ${summary.optionalMissing}`,
  `- Dead script references: ${summary.deadScriptReferences}`,
  `- Markdown files (total): ${summary.markdownTotal}`,
  `- Markdown files (canonical): ${summary.markdownCanonical}`,
  `- Markdown files (historical/outside canonical): ${summary.markdownHistorical}`,
  '',
  '## Required Missing References',
  '| Source | Key | Path | Status | Notes |',
  '| --- | --- | --- | --- | --- |',
  ...(requiredMissing.length ? requiredMissing.map(rowForCheck) : ['| - | - | - | none | - |']),
  '',
  '## Optional Missing References',
  '| Source | Key | Path | Status | Notes |',
  '| --- | --- | --- | --- | --- |',
  ...(optionalMissing.length ? optionalMissing.map(rowForCheck) : ['| - | - | - | none | - |']),
  '',
  '## Dead Script References',
  '| Source | Source Script | Command Type | Target Script | Target Package | Notes |',
  '| --- | --- | --- | --- | --- | --- |',
  ...(deadScriptRefs.length
    ? deadScriptRefs.map(
        (entry) =>
          `| ${entry.source} | \`${entry.sourceScript}\` | ${entry.commandType} | \`${entry.targetScript}\` | \`${entry.targetPackage}\` | ${entry.reason || '-'} |`
      )
    : ['| - | - | - | - | - | none |']),
  '',
  '## Top-Level Directory Classification',
  '| Directory | References | Classification |',
  '| --- | ---: | --- |',
  ...directoryMatrix.map(matrixRow),
  '',
  '## Surface Ownership Matrix',
  '| Surface | Owner | Primary Paths |',
  '| --- | --- | --- |',
  ...surfaceOwners.map((entry) => `| ${entry.surface} | ${entry.owner} | ${entry.paths} |`),
  '',
  '## Rules',
  '1. Required missing references must be fixed before merge.',
  '2. Optional missing references must remain explicitly guarded in scripts/workflows.',
  '3. `ORPHAN_CANDIDATE` and `EXTERNAL_ONLY` directories require owner decision in canonical docs before reuse.',
  '',
].join('\n')

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, markdown, 'utf8')
}

console.log(JSON.stringify(summary, null, 2))

if (failOnMissing && requiredMissing.length > 0) {
  process.exit(1)
}

if (failOnMissing && deadScriptRefs.length > 0) {
  process.exit(1)
}
