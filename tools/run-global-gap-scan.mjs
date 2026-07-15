#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const docsMaster = path.join(repoRoot, 'docs', 'master')
const reportPath = path.join(docsMaster, '32_GLOBAL_GAP_REGISTER_2026-03-01.md')

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage'])

function walkFiles(rootDir, predicate, out = []) {
  if (!fs.existsSync(rootDir)) return out
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const full = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, predicate, out)
      continue
    }
    if (predicate(full)) out.push(full)
  }
  return out
}

function countLines(filePath) {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/')
}

function scanLargeFiles() {
  const codeFiles = walkFiles(
    webRoot,
    (f) => /\.(ts|tsx|js|mjs|css)$/i.test(f)
  )
  const large = codeFiles
    .map((file) => ({ file: rel(file), lines: countLines(file) }))
    .filter((item) => item.lines >= 1200)
    .sort((a, b) => b.lines - a.lines)
  return large
}

function scanBlockingDialogs() {
  const files = walkFiles(
    webRoot,
    (f) => /\.(ts|tsx|js|mjs)$/i.test(f)
  )
  const hits = []
  const dialogRegex = /(?:^|[^\w$.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/
  for (const file of files) {
    const relative = rel(file)
    if (relative.includes('/__tests__/')) continue
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split(/\r?\n/)
    lines.forEach((line, i) => {
      if (!dialogRegex.test(line)) return
      if (/\b(?:confirm|prompt|alert)\s*\([^)]*\)\s*[:{]/.test(line)) return
      if (/\bprompt\(\)\s*:/.test(line)) return
      hits.push({
        file: relative,
        line: i + 1,
        text: line.trim(),
      })
    })
  }
  const active = hits.filter((h) => !h.file.includes('/_deprecated/'))
  const deprecated = hits.filter((h) => h.file.includes('/_deprecated/'))
  return { all: hits, active, deprecated }
}

function scanApiNotImplemented() {
  const apiRoot = path.join(webRoot, 'app', 'api')
  const files = walkFiles(apiRoot, (f) => /\.(ts|tsx|js|mjs)$/i.test(f))
  const markers = ['NOT_IMPLEMENTED', 'notImplementedCapability(', 'PAYMENT_GATEWAY_NOT_IMPLEMENTED']
  return files
    .map((file) => {
      const content = fs.readFileSync(file, 'utf8')
      const matched = markers.some((m) => content.includes(m))
      if (!matched) return null
      return rel(file)
    })
    .filter(Boolean)
    .sort()
}

function scanCanonicalReadOrder() {
  const indexPath = path.join(docsMaster, '00_INDEX.md')
  if (!fs.existsSync(indexPath)) {
    return { missingFromReadOrder: [], activeDocs: 0, referencedDocs: 0 }
  }
  const indexContent = fs.readFileSync(indexPath, 'utf8')
  const activeFromTable = new Set()
  for (const line of indexContent.split(/\r?\n/)) {
    const fileMatch = line.match(/\|\s*`([^`]+\.md)`\s*\|/)
    if (!fileMatch) continue
    if (!line.includes('| ACTIVE |')) continue
    activeFromTable.add(fileMatch[1])
  }
  const referenced = new Set(
    (indexContent.match(/docs\/master\/([A-Za-z0-9_.-]+\.md)/g) ?? [])
      .map((line) => line.replace(/^docs\/master\//, ''))
  )
  const missingFromReadOrder = [...activeFromTable]
    .filter((name) => !referenced.has(name))
    .sort()
  return {
    missingFromReadOrder,
    activeDocs: activeFromTable.size,
    referencedDocs: referenced.size,
  }
}

function scanMarkdownInventory() {
  const allMd = walkFiles(repoRoot, (f) => /\.md$/i.test(f))
  const canonicalMd = walkFiles(docsMaster, (f) => /\.md$/i.test(f))
  return {
    total: allMd.length,
    canonical: canonicalMd.length,
    nonCanonical: allMd.length - canonicalMd.length,
  }
}

function scanNonCanonicalMarkdownDistribution(limit = 10) {
  const allMd = walkFiles(repoRoot, (f) => /\.md$/i.test(f)).map(rel)
  const canonicalPrefix = 'docs/master/'
  const counts = new Map()

  for (const file of allMd) {
    if (file.startsWith(canonicalPrefix)) continue
    const segments = file.split('/')
    const bucket = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0]
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function buildReport() {
  const largeFiles = scanLargeFiles()
  const dialog = scanBlockingDialogs()
  const apiGates = scanApiNotImplemented()
  const md = scanMarkdownInventory()
  const nonCanonicalMdTop = scanNonCanonicalMarkdownDistribution()
  const readOrder = scanCanonicalReadOrder()

  const topLarge = largeFiles.slice(0, 20)
  const topDialogs = dialog.active.slice(0, 20)
  const hotspotP0 =
    largeFiles.length === 0
      ? "Manter `0` hotspots (`>=1200` linhas) no escopo ativo."
      : "Continuar decomposicao dos hotspots acima de 1200 linhas fora do shell principal."
  const topLargeSection =
    topLarge.length === 0
      ? '1. Nenhum hotspot acima de 1200 linhas no escopo ativo.'
      : topLarge.map((item, index) => `${index + 1}. \`${item.file}\` (\`${item.lines}\` linhas)`).join('\n')
  const dialogP0 =
    dialog.active.length === 0
      ? "Manter `0` dialogs bloqueantes ativos (`window.confirm/alert/prompt`) e bloquear regressao."
      : "Reduzir dialogs bloqueantes ativos (`window.confirm/alert/prompt`) em superficies nao-deprecated."
  const readOrderP0 =
    readOrder.missingFromReadOrder.length === 0
      ? "Manter `00_INDEX` com read-order canonico completo (sem drift)."
      : "Eliminar drift entre documentos canonicos e read-order no `00_INDEX`."

  return `# 32_GLOBAL_GAP_REGISTER_2026-03-01
Status: ACTIVE GAP REGISTER
Date: 2026-03-01
Owner: Platform + PM Tecnico

## 1) Objetivo
Publicar uma varredura factual unica de lacunas tecnicas/ux ainda abertas no estado atual do repositorio.

## 2) Snapshot factual
1. Markdown total no repo: \`${md.total}\`
2. Markdown canonico (\`docs/master\`): \`${md.canonical}\`
3. Markdown fora do canonico: \`${md.nonCanonical}\`
4. Arquivos grandes (\`>=1200\` linhas) em \`cloud-web-app/web\`: \`${largeFiles.length}\`
5. Uso de dialogs bloqueantes (ativo): \`${dialog.active.length}\`
6. Uso de dialogs bloqueantes (deprecated): \`${dialog.deprecated.length}\`
7. APIs com gate \`NOT_IMPLEMENTED\` explicito: \`${apiGates.length}\`
8. Docs canonicos sem referencia no read-order do \`00_INDEX\`: \`${readOrder.missingFromReadOrder.length}\`
9. Top origens de markdown nao-canonico:
${nonCanonicalMdTop.length === 0 ? '   - Nenhuma origem nao-canonica.' : nonCanonicalMdTop.map((item) => `   - \`${item.bucket}\`: ${item.count}`).join('\n')}

## 3) Lacunas abertas (prioridade)
### P0
1. ${hotspotP0}
2. ${dialogP0}
3. Manter gates \`NOT_IMPLEMENTED\` explicitos apenas onde a capacidade realmente nao existe.
4. ${readOrderP0}

### P1
1. Consolidar markdown nao-canonico e reduzir volume consultivo fora de \`docs/master\`.
2. Fechar evidencias de colaboracao (carga/conflito) para promocao de \`PARTIAL\` -> \`IMPLEMENTED\`.
3. Fechar varredura runtime de acessibilidade (axe/lighthouse) para claim de cobertura completa.

## 4) Top hotspots >=1200 linhas
${topLargeSection}

## 5) Dialogs bloqueantes ativos (amostra)
${topDialogs.length === 0 ? '1. Nenhum encontrado no escopo ativo.' : topDialogs.map((item, index) => `${index + 1}. \`${item.file}:${item.line}\` -> \`${item.text.replace(/`/g, "'")}\``).join('\n')}

## 6) APIs com NOT_IMPLEMENTED explicito
${apiGates.length === 0 ? '1. Nenhuma rota com NOT_IMPLEMENTED explicito no escopo ativo.' : apiGates.map((file, index) => `${index + 1}. \`${file}\``).join('\n')}

## 7) Docs canonicos ausentes no read-order do 00_INDEX
${readOrder.missingFromReadOrder.length === 0 ? '1. Nenhum doc canonico fora do read-order.' : readOrder.missingFromReadOrder.map((file, index) => `${index + 1}. \`docs/master/${file}\``).join('\n')}

## 8) Regras de governanca
1. Nao remover gate explicito para mascarar lacuna funcional.
2. Nao promover claim de mercado enquanto P0 acima estiver aberto.
3. Atualizar este registro em toda wave de freeze.
4. Evidencia \`core_loop_drill\` (e demais fontes de ensaio) conta apenas como \`rehearsal\`, nunca para promocao L4.
`
}

const report = buildReport()
fs.writeFileSync(reportPath, report, 'utf8')
console.log(`[gap-scan] report written: ${rel(reportPath)}`)
