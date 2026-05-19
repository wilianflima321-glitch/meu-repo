#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_SCOPE = 'components'
const OUTPUT = path.join(ROOT, 'docs', 'PT_HARDCODED_INVENTORY.csv')

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

function parseArgs() {
  const args = process.argv.slice(2)
  const scopeIndex = args.indexOf('--scope')
  const scope = scopeIndex >= 0 ? args[scopeIndex + 1] : DEFAULT_SCOPE
  const outputIndex = args.indexOf('--output')
  const output = outputIndex >= 0 ? args[outputIndex + 1] : OUTPUT

  return {
    scope: path.resolve(ROOT, scope),
    output: path.resolve(ROOT, output),
  }
}

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
  const normalized = relativePath.replaceAll(path.sep, '/')
  return (
    normalized.includes('/(auth)/') ||
    /^app\/(login|register|forgot-password|reset-password|verify-email)\//.test(normalized) ||
    normalized.startsWith('components/auth/')
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

function inferDomain(relativePath) {
  const normalized = relativePath.replaceAll(path.sep, '/')
  return DOMAIN_RULES.find(([pattern]) => pattern.test(normalized))?.[1] ?? 'product'
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function buildInventory(scope) {
  const findings = []

  for (const filePath of walk(scope)) {
    const relative = path.relative(ROOT, filePath)
    const domain = inferDomain(relative)
    const source = stripComments(fs.readFileSync(filePath, 'utf8'))

    source.split(/\r?\n/).forEach((line, index) => {
      if (!lineHasUserCopy(line, relative)) return
      findings.push({
        file: relative.replaceAll(path.sep, '/'),
        line: index + 1,
        string: line.trim().slice(0, 500),
        domain,
      })
    })
  }

  return findings.sort((a, b) => {
    if (a.domain !== b.domain) return a.domain.localeCompare(b.domain)
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    return a.line - b.line
  })
}

function writeInventory(output, findings) {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  const rows = [
    ['file', 'line', 'string', 'domain'].map(csvCell).join(','),
    ...findings.map((finding) =>
      [finding.file, finding.line, finding.string, finding.domain].map(csvCell).join(',')
    ),
  ]
  fs.writeFileSync(output, `${rows.join('\n')}\n`)
}

const { scope, output } = parseArgs()
const findings = buildInventory(scope)
writeInventory(output, findings)

const byDomain = findings.reduce((acc, finding) => {
  acc[finding.domain] = (acc[finding.domain] ?? 0) + 1
  return acc
}, {})

console.log(
  `[scan-hardcoded-pt] PASS findings=${findings.length} files=${
    new Set(findings.map((finding) => finding.file)).size
  } output=${path.relative(ROOT, output)}`
)
console.log(
  `[scan-hardcoded-pt] domains=${Object.entries(byDomain)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => `${domain}:${count}`)
    .join(',')}`
)
