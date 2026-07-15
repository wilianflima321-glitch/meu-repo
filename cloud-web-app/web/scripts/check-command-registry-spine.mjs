#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function lineCount(content) {
  return content.split(/\r?\n/).length
}

function fail(message) {
  failures.push(message)
}

const registryPath = 'lib/commands/command-registry.tsx'
const defaultsPath = 'lib/commands/default-commands.ts'

for (const file of [registryPath, defaultsPath]) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`${file}: missing`)
}

if (failures.length === 0) {
  const registry = read(registryPath)
  const defaults = read(defaultsPath)
  const registryLines = lineCount(registry)
  const defaultsLines = lineCount(defaults)

  if (!/import \{ DEFAULT_COMMANDS \} from '\.\/default-commands'/.test(registry)) {
    fail(`${registryPath}: command definitions must stay split into default-commands.ts`)
  }

  if (!/shortcutMatchesEvent/.test(registry)) {
    fail(`${registryPath}: global shortcuts must use the normalized shortcut matcher`)
  }

  if (registryLines > 550) fail(`${registryPath}: ${registryLines} lines exceeds 550 command-shell budget`)
  if (defaultsLines > 650) fail(`${defaultsPath}: ${defaultsLines} lines exceeds 650 default-command budget`)

  const combined = `${registry}\n${defaults}`
  const badEncoding = combined.match(/[ÃÂ�â]|⌘/g)
  if (badEncoding) {
    fail(`command registry copy contains mojibake or platform glyphs: ${[...new Set(badEncoding)].join(', ')}`)
  }

  const hardcodedPortuguese = combined.match(/\b(Novo|Abrir|Salvar|Executar|Configura[cç][aã]o|Projeto|Criar|Pesquisar|Arquivo|Janela)\b/gi)
  if (hardcodedPortuguese) {
    fail(`command registry copy contains likely PT-BR labels: ${[...new Set(hardcodedPortuguese)].slice(0, 12).join(', ')}`)
  }

  const shortcuts = [...defaults.matchAll(/(?:shortcut|altShortcut):\s*'([^']+)'/g)].map((match) => match[1])
  for (const shortcut of shortcuts) {
    if (/\s/.test(shortcut)) fail(`${defaultsPath}: shortcut '${shortcut}' contains spaces; use Cmd+Shift+P format`)
    if (!/^(?:(?:Cmd|Ctrl|Alt|Shift)\+)*(?:[A-Z0-9]|F\d{1,2}|Enter|Escape|Tab|Backspace|Delete|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|`|-|=|,|\.|\/)$/.test(shortcut)) {
      fail(`${defaultsPath}: shortcut '${shortcut}' is not in the canonical readable format`)
    }
  }
}

if (failures.length > 0) {
  console.error('[command-registry-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[command-registry-spine] PASS split=true shortcuts=readable copy=en-US fileBudget=ok')
