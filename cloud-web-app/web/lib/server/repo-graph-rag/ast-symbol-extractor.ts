import ts from 'typescript'

export interface SymbolBounds {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'unknown'
  startLine: number
  endLine: number
}

export interface AstExtractionResult {
  /** The list of modules this file imports. */
  imports: Array<{
    moduleSpecifier: string
    /** Specific named imports from this module. If empty, it's a default or namespace import. */
    importedNames: string[]
  }>
  /** The exported symbols available in this file with their exact bounds. */
  exportedSymbols: SymbolBounds[]
}

/**
 * Parses a TS/JS file using the TypeScript Compiler API.
 * Extracts explicit import statements and all exported symbols (with line bounds)
 * to enable ultra-dense Symbol-level RAG Slicing.
 */
export function extractAstSymbols(content: string, fileName: string): AstExtractionResult {
  const sourceFile = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') || fileName.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  const imports: AstExtractionResult['imports'] = []
  const exportedSymbols: SymbolBounds[] = []

  function getLineFromPos(pos: number): number {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1
  }

  function hasExportModifier(node: ts.Node): boolean {
    if (!ts.canHaveModifiers(node)) return false
    const modifiers = ts.getModifiers(node)
    if (!modifiers) return false
    return modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
  }

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text
        const importedNames: string[] = []
        
        if (node.importClause) {
          if (node.importClause.name) {
            importedNames.push('default')
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                importedNames.push(element.name.text)
              }
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              importedNames.push('*')
            }
          }
        }
        imports.push({ moduleSpecifier: specifier, importedNames })
      }
    } else if (hasExportModifier(node)) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        exportedSymbols.push({
          name: node.name.text,
          kind: 'function',
          startLine: getLineFromPos(node.getStart(sourceFile)),
          endLine: getLineFromPos(node.getEnd())
        })
      } else if (ts.isClassDeclaration(node) && node.name) {
        exportedSymbols.push({
          name: node.name.text,
          kind: 'class',
          startLine: getLineFromPos(node.getStart(sourceFile)),
          endLine: getLineFromPos(node.getEnd())
        })
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        exportedSymbols.push({
          name: node.name.text,
          kind: 'interface',
          startLine: getLineFromPos(node.getStart(sourceFile)),
          endLine: getLineFromPos(node.getEnd())
        })
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        exportedSymbols.push({
          name: node.name.text,
          kind: 'type',
          startLine: getLineFromPos(node.getStart(sourceFile)),
          endLine: getLineFromPos(node.getEnd())
        })
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exportedSymbols.push({
              name: decl.name.text,
              kind: 'variable',
              startLine: getLineFromPos(node.getStart(sourceFile)),
              endLine: getLineFromPos(node.getEnd())
            })
          }
        }
      }
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        // export * from 'X' or export { Y } from 'X'
        imports.push({
          moduleSpecifier: node.moduleSpecifier.text,
          importedNames: node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements.map(e => e.name.text)
            : ['*']
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return { imports, exportedSymbols }
}
