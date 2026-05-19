#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, 'docs', 'PT_HARDCODED_SPINE.md')

const BASELINES = {
  app: 0,
  components: 0,
  total: 0,
}

const PORTUGUESE_COPY_PATTERNS = [
  /[\u00e1\u00e9\u00ed\u00f3\u00fa\u00e0\u00e2\u00ea\u00f4\u00e3\u00f5\u00e7\u00c1\u00c9\u00cd\u00d3\u00da\u00c0\u00c2\u00ca\u00d4\u00c3\u00d5\u00c7]/,
  /\b(Configura\u00e7\u00f5es|P\u00e1gina|Salvar|Cancelar|Excluir|Carregando|Falha|Erro|Projeto|Projetos|Arquivo|Arquivos)\b/i,
  /\b(Pronto|Ativo|Inativo|Suspenso|Conclu\u00eddo|Notifica\u00e7\u00f5es|Hist\u00f3rico|Altera\u00e7\u00f5es)\b/i,
  /\b(Usu\u00e1rio|Usu\u00e1rios|Seguran\u00e7a|Integra\u00e7\u00f5es|Opera\u00e7\u00e3o|Concilia\u00e7\u00e3o|Governan\u00e7a)\b/i,
]

const AUTH_ROMANIZED_PT_PATTERNS = [
  /\b(Voltar|Entrar|Senha|Esqueci|Digite|Continuar com|Proximo|Formulario|Cadastro|Cadastrar)\b/i,
  /\b(voce|nao|conta|senha|redefinicao|verificacao|instrucoes|painel|usuario|superficie|missao|estudio)\b/i,
]

const ALLOWED_PATH_PARTS = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}stories${path.sep}`,
  `${path.sep}public${path.sep}locales${path.sep}`,
  `${path.sep}lib${path.sep}locales${path.sep}`,
  `${path.sep}docs${path.sep}`,
  '.stories.',
]

const DOMAIN_RULES = [
  [/components[\\/]admin[\\/]|app[\\/]admin[\\/]/, 'admin'],
  [/components[\\/]billing[\\/]|app[\\/]billing[\\/]/, 'billing'],
  [/components[\\/]marketplace[\\/]|app[\\/]marketplace[\\/]/, 'marketplace'],
  [/components[\\/]dashboard[\\/]|app[\\/]dashboard[\\/]/, 'dashboard'],
  [/components[\\/]editor[\\/]|components[\\/]ide[\\/]|app[\\/]ide[\\/]/, 'ide'],
  [/components[\\/]studio[\\/]|app[\\/]studio[\\/]/, 'studio'],
  [/components[\\/]settings[\\/]|app[\\/]settings[\\/]/, 'settings'],
  [/components[\\/]auth[\\/]|app[\\/](login|register|reset-password|forgot-password)/, 'auth'],
  [/components[\\/]viewport[\\/]|components[\\/]engine[\\/]|components[\\/]terrain[\\/]/, 'engine'],
  [/components[\\/]video[\\/]|components[\\/]sequencer[\\/]|components[\\/]animation[\\/]/, 'film'],
  [/components[\\/]character[\\/]|components[\\/]narrative[\\/]|components[\\/]physics[\\/]/, 'game'],
]

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) return []
    if (ALLOWED_PATH_PARTS.some((part) => fullPath.includes(part))) return []
    return [fullPath]
  })
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+\/\/.*$/gm, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function isAuthSurface(relativePath) {
  return (
    relativePath.includes('/(auth)/') ||
    /^app\/(login|register|forgot-password|reset-password|verify-email)\//.test(relativePath) ||
    relativePath.startsWith('components/auth/')
  )
}

function lineHasUserCopy(line, relativePath) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^\*|^\/\//.test(trimmed)) return false
  if (/import\s|export\s+type|export\s+interface/.test(trimmed)) return false
  if (/^[\w$]+\?:/.test(trimmed)) return false
  if (/^[\w$]+:\s*(string|number|boolean|React|Record|Array|Promise|Date)\b/.test(trimmed)) return false
  return (
    PORTUGUESE_COPY_PATTERNS.some((pattern) => pattern.test(line)) ||
    (isAuthSurface(relativePath) && AUTH_ROMANIZED_PT_PATTERNS.some((pattern) => pattern.test(line)))
  )
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function inferDomain(relativePath) {
  return DOMAIN_RULES.find(([pattern]) => pattern.test(relativePath))?.[1] ?? 'product'
}

function scanScope(scopeName) {
  const scopeRoot = path.join(ROOT, scopeName)
  const findings = []

  for (const filePath of walk(scopeRoot)) {
    const relative = rel(filePath)
    const domain = inferDomain(relative)
    const source = stripComments(fs.readFileSync(filePath, 'utf8'))

    source.split(/\r?\n/).forEach((line, index) => {
      if (!lineHasUserCopy(line, relative)) return
      findings.push({
        scope: scopeName,
        file: relative,
        line: index + 1,
        domain,
        sample: line.trim().slice(0, 220),
      })
    })
  }

  return findings
}

const findings = [...scanScope('app'), ...scanScope('components')]
const counts = {
  app: findings.filter((finding) => finding.scope === 'app').length,
  components: findings.filter((finding) => finding.scope === 'components').length,
  total: findings.length,
}
const byDomain = findings.reduce((acc, finding) => {
  acc[finding.domain] = (acc[finding.domain] ?? 0) + 1
  return acc
}, {})

const failures = []
for (const [key, baseline] of Object.entries(BASELINES)) {
  if (counts[key] > baseline) failures.push(`${key}=${counts[key]} above max=${baseline}`)
}

const report = []
report.push('# PT_HARDCODED_SPINE.md')
report.push('Generated: deterministic local scan')
report.push('')
report.push(`- Findings total: ${counts.total} / ${BASELINES.total}`)
report.push(`- App findings: ${counts.app} / ${BASELINES.app}`)
report.push(`- Component findings: ${counts.components} / ${BASELINES.components}`)
report.push(`- Failures: ${failures.length}`)
report.push('')
report.push('## Domain Counts')
for (const [domain, count] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
  report.push(`- ${domain}: ${count}`)
}
report.push('')
report.push('## Highest Priority Samples')
for (const finding of findings.slice(0, 80)) {
  report.push(`- ${finding.file}:${finding.line} [${finding.domain}] ${finding.sample}`)
}
report.push('')
report.push('## Failures')
if (failures.length === 0) report.push('- none')
else failures.forEach((failure) => report.push(`- ${failure}`))

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
fs.writeFileSync(OUTPUT, `${report.join('\n')}\n`, 'utf8')

if (failures.length > 0) {
  console.error(`[i18n-hardcoded-spine] FAIL ${failures.join('; ')} report=${rel(OUTPUT)}`)
  process.exitCode = 1
} else {
  console.log(
    `[i18n-hardcoded-spine] PASS total=${counts.total}/${BASELINES.total} app=${counts.app}/${BASELINES.app} components=${counts.components}/${BASELINES.components} report=${rel(OUTPUT)}`,
  )
}
