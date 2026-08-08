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
    return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  }

  function pushExport(
    name: string,
    kind: SymbolBounds['kind'],
    start: number,
    end: number
  ): void {
    exportedSymbols.push({
      name,
      kind,
      startLine: getLineFromPos(start),
      endLine: getLineFromPos(end),
    })
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
                // Module export name (not local alias): `import { foo as bar }` → `foo`
                importedNames.push(element.propertyName?.text ?? element.name.text)
              }
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              importedNames.push('*')
            }
          }
        } else {
          // Side-effect import: `import './x'`
          importedNames.push('*')
        }
        imports.push({ moduleSpecifier: specifier, importedNames })
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      imports.push({
        moduleSpecifier: node.arguments[0].text,
        importedNames: ['*'],
      })
    } else if (hasExportModifier(node)) {
      const isDefault = Boolean(
        ts.canHaveModifiers(node) &&
          ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      )
      if (ts.isFunctionDeclaration(node)) {
        if (node.name) {
          pushExport(node.name.text, 'function', node.getStart(sourceFile), node.getEnd())
        }
        if (isDefault) {
          pushExport('default', 'function', node.getStart(sourceFile), node.getEnd())
        }
      } else if (ts.isClassDeclaration(node)) {
        if (node.name) {
          pushExport(node.name.text, 'class', node.getStart(sourceFile), node.getEnd())
        }
        if (isDefault) {
          pushExport('default', 'class', node.getStart(sourceFile), node.getEnd())
        }
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        pushExport(node.name.text, 'interface', node.getStart(sourceFile), node.getEnd())
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        pushExport(node.name.text, 'type', node.getStart(sourceFile), node.getEnd())
      } else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            pushExport(decl.name.text, 'variable', node.getStart(sourceFile), node.getEnd())
          }
        }
      } else if (ts.isEnumDeclaration(node) && node.name) {
        pushExport(node.name.text, 'unknown', node.getStart(sourceFile), node.getEnd())
      }
    } else if (ts.isExportAssignment(node) && !node.isExportEquals) {
      pushExport('default', 'unknown', node.getStart(sourceFile), node.getEnd())
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({
          moduleSpecifier: node.moduleSpecifier.text,
          importedNames:
            node.exportClause && ts.isNamedExports(node.exportClause)
              ? node.exportClause.elements.map(
                  (e) => e.propertyName?.text ?? e.name.text
                )
              : ['*'],
        })
      } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          pushExport(
            el.name.text,
            'unknown',
            node.getStart(sourceFile),
            node.getEnd()
          )
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return { imports, exportedSymbols }
}
