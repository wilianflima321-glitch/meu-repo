import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components', 'lib', 'docs']
const EXTENSIONS = new Set(['.ts', '.tsx', '.md', '.css'])
const OUT = path.join(ROOT, 'docs', 'MOJIBAKE_SCAN.md')
const ignoreDirs = new Set(['node_modules', '.next', 'dist', 'build'])
const ignoreFiles = new Set(['docs/MOJIBAKE_SCAN.md'])

// Focus on high-confidence corruption signatures, not valid Portuguese accents.
const PATTERNS = [
  /Ãƒ/,
  /Ã¢â‚¬|Ã¢â€|â€œ|â€|â€™|â€“|â€”|â€¦/,
  /ï¸|âƒ£/,
  /Â©|Â®|Â±|Â·/,
  /\uFFFD/,
]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue

    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs, out)
      continue
    }

    if (EXTENSIONS.has(path.extname(entry.name))) out.push(abs)
  }
  return out
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
const findings = []

for (const file of files) {
  const relative = rel(file)
  if (ignoreFiles.has(relative)) continue

  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (PATTERNS.some((pattern) => pattern.test(line))) {
      findings.push({
        file: relative,
        line: index + 1,
        sample: line.trim().slice(0, 180),
      })
    }
  })
}

const report = []
report.push('# MOJIBAKE_SCAN.md')
report.push(`Generated: ${new Date().toISOString()}`)
report.push('')
report.push(`- Files scanned: ${files.length}`)
report.push(`- Findings: ${findings.length}`)
report.push('')
report.push('## Findings')

if (findings.length === 0) {
  report.push('- none')
} else {
  for (const item of findings.slice(0, 500)) {
    report.push(`- ${item.file}:${item.line} -> ${item.sample}`)
  }
  if (findings.length > 500) {
    report.push(`- ... truncated (${findings.length - 500} more)`)
  }
}

fs.writeFileSync(OUT, `${report.join('\n')}\n`, 'utf8')
console.log(`[mojibake-scan] findings=${findings.length} report=${rel(OUT)}`)
