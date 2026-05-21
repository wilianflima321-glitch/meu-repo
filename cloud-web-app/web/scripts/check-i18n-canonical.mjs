import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, 'docs', 'I18N_CANONICAL_AUDIT.md')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])
const IGNORED_PARTS = new Set(['node_modules', '.next', 'coverage', 'dist', 'build', '.git'])

const CANONICAL_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'ja', 'zh']
const COMPATIBILITY_FILES = new Set([
  'lib/i18n.ts',
  'lib/translations.ts',
  'lib/translations.types.ts',
  'lib/locales/pt-BR.ts',
])

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_PARTS.has(entry.name)) continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(absolutePath, files)
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolutePath)
  }
  return files
}

function rel(absolutePath) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, '/')
}

const failures = []
const findings = []

for (const absolutePath of walk(ROOT)) {
  const relativePath = rel(absolutePath)
  const source = fs.readFileSync(absolutePath, 'utf8')
  const isCompatibilityFile = COMPATIBILITY_FILES.has(relativePath)

  if (!isCompatibilityFile && /@\/lib\/locales|lib\/locales|from ['"].*locales\//.test(source)) {
    failures.push(`${relativePath}: imports legacy lib/locales; use public/locales + next-i18next copy boundaries`)
  }

  if (!isCompatibilityFile && /@\/lib\/translations|lib\/translations|from ['"].*translations/.test(source)) {
    failures.push(`${relativePath}: imports legacy lib/translations; keep it behind lib/i18n.ts compatibility only`)
  }

  if (/lib\/locales|lib\/translations|from ['"].*translations/.test(source)) {
    findings.push(relativePath)
  }
}

const nextI18nConfig = path.join(ROOT, 'next-i18next.config.js')
if (!fs.existsSync(nextI18nConfig)) {
  failures.push('next-i18next.config.js: missing canonical config')
} else {
  const configSource = fs.readFileSync(nextI18nConfig, 'utf8')
  for (const locale of CANONICAL_LOCALES) {
    if (!configSource.includes(`'${locale}'`) && !configSource.includes(`"${locale}"`)) {
      failures.push(`next-i18next.config.js: missing locale ${locale}`)
    }
  }
  if (!/defaultLocale:\s*['"]en['"]/.test(configSource)) {
    failures.push('next-i18next.config.js: defaultLocale must remain en')
  }
}

for (const locale of CANONICAL_LOCALES) {
  const localeDir = path.join(ROOT, 'public', 'locales', locale)
  if (!fs.existsSync(localeDir)) failures.push(`public/locales/${locale}: missing canonical locale directory`)
}

const report = [
  '# I18N_CANONICAL_AUDIT.md',
  'Generated: deterministic local scan',
  '',
  `- Canonical system: next-i18next + public/locales/{${CANONICAL_LOCALES.join(',')}}`,
  '- Legacy compatibility: lib/i18n.ts may bridge lib/translations.ts for one release only',
  `- Legacy touchpoints found: ${findings.length}`,
  `- Failures: ${failures.length}`,
  '',
  '## Compatibility Files',
  ...[...COMPATIBILITY_FILES].sort().map((file) => `- \`${file}\``),
  '',
  '## Legacy Touchpoints',
  ...(findings.length ? [...new Set(findings)].sort().map((file) => `- \`${file}\``) : ['- none']),
  '',
  '## Failures',
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ['- none']),
  '',
].join('\n')

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
fs.writeFileSync(OUTPUT, report)

if (failures.length > 0) {
  console.error(report)
  process.exit(1)
}

console.log('[i18n-canonical] PASS canonical=next-i18next legacy-imports=blocked')
