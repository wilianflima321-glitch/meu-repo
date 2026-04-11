import type { DocumentSymbol, SymbolKind } from './OutlinePanel'

function createSymbol(
  name: string,
  kind: SymbolKind,
  lineNumber: number,
  detail?: string
): DocumentSymbol {
  return {
    name,
    kind,
    detail,
    range: {
      startLine: lineNumber,
      startColumn: 1,
      endLine: lineNumber,
      endColumn: 1,
    },
    selectionRange: {
      startLine: lineNumber,
      startColumn: 1,
      endLine: lineNumber,
      endColumn: 1,
    },
  }
}

function parseCodeSymbols(lines: string[]): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = []

  lines.forEach((line, index) => {
    const lineNumber = index + 1
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return

    let match = trimmed.match(/^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_]+)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'class', lineNumber))
      return
    }

    match = trimmed.match(/^(?:export\s+)?interface\s+([A-Za-z0-9_]+)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'interface', lineNumber))
      return
    }

    match = trimmed.match(/^(?:export\s+)?enum\s+([A-Za-z0-9_]+)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'enum', lineNumber))
      return
    }

    match = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z0-9_]+)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'typeParameter', lineNumber, 'type'))
      return
    }

    match = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'function', lineNumber))
      return
    }

    match = trimmed.match(/^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\(|function\b)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'function', lineNumber, 'const'))
      return
    }

    match = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)/)
    if (match) {
      symbols.push(createSymbol(match[1], 'variable', lineNumber))
      return
    }

    match = trimmed.match(/^(?:public|private|protected|static|readonly|async|\s)*([A-Za-z0-9_]+)\s*\(/)
    if (match && !trimmed.startsWith('if ') && !trimmed.startsWith('for ') && !trimmed.startsWith('while ')) {
      symbols.push(createSymbol(match[1], 'method', lineNumber))
    }
  })

  return symbols
}

function parseMarkdownSymbols(lines: string[]): DocumentSymbol[] {
  return lines.reduce<DocumentSymbol[]>((acc, line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (!match) return acc
    acc.push(createSymbol(match[2].trim(), 'namespace', index + 1, `${match[1].length === 1 ? 'h1' : `h${match[1].length}`}`))
    return acc
  }, [])
}

function parseJsonSymbols(lines: string[]): DocumentSymbol[] {
  return lines.reduce<DocumentSymbol[]>((acc, line, index) => {
    const match = line.match(/^\s*"([^"]+)"\s*:/)
    if (!match) return acc
    acc.push(createSymbol(match[1], 'key', index + 1))
    return acc
  }, [])
}

export function buildOutlineSymbols(content: string, language?: string): DocumentSymbol[] {
  const lines = content.split(/\r?\n/)
  const normalized = (language || '').toLowerCase()

  if (normalized === 'markdown') {
    return parseMarkdownSymbols(lines)
  }

  if (normalized === 'json') {
    return parseJsonSymbols(lines)
  }

  return parseCodeSymbols(lines)
}
