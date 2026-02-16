import * as ts from 'typescript'

type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationCheck {
  id: string
  severity: ValidationSeverity
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export interface DependencyImpact {
  localImports: string[]
  externalImports: string[]
}

export interface ChangeValidationResult {
  canApply: boolean
  verdict: 'APPLY_ALLOWED' | 'APPLY_BLOCKED'
  checks: ValidationCheck[]
  dependencyImpact: DependencyImpact
}

type ValidateInput = {
  original: string
  modified: string
  fullDocument?: string
  filePath?: string
  language?: string
}

const MAX_DOCUMENT_SIZE = 400_000

function extname(filePath?: string): string {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/')
  const name = normalized.split('/').pop() || normalized
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : ''
}

function detectLanguage(inputLanguage?: string, filePath?: string): string {
  if (inputLanguage) return inputLanguage.toLowerCase()
  const ext = extname(filePath)
  if (ext === 'ts') return 'typescript'
  if (ext === 'tsx') return 'typescriptreact'
  if (ext === 'js') return 'javascript'
  if (ext === 'jsx') return 'javascriptreact'
  if (ext === 'json') return 'json'
  if (ext === 'md') return 'markdown'
  return 'plaintext'
}

function extractImports(source: string): DependencyImpact {
  const importMatches = source.match(/(?:import|export)\s+[^'"]*from\s*['"]([^'"]+)['"]/g) || []
  const localImports: string[] = []
  const externalImports: string[] = []

  for (const statement of importMatches) {
    const pathMatch = statement.match(/['"]([^'"]+)['"]/)
    const dep = pathMatch?.[1]?.trim()
    if (!dep) continue
    if (dep.startsWith('./') || dep.startsWith('../') || dep.startsWith('/')) {
      localImports.push(dep)
    } else {
      externalImports.push(dep)
    }
  }

  return { localImports, externalImports }
}

function validateJson(content: string): ValidationCheck[] {
  try {
    JSON.parse(content)
    return [
      {
        id: 'JSON_PARSE',
        severity: 'info',
        status: 'pass',
        message: 'JSON parse check passed.',
      },
    ]
  } catch (error) {
    return [
      {
        id: 'JSON_PARSE',
        severity: 'error',
        status: 'fail',
        message: `JSON parse failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
      },
    ]
  }
}

function validateTsLike(content: string, language: string): ValidationCheck[] {
  const scriptKind =
    language === 'typescriptreact'
      ? ts.ScriptKind.TSX
      : language === 'javascriptreact'
        ? ts.ScriptKind.JSX
        : language === 'typescript'
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JS

  const transpile = ts.transpileModule(content, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
    fileName: `inline-edit.${scriptKind === ts.ScriptKind.JS || scriptKind === ts.ScriptKind.JSX ? 'js' : 'ts'}`,
  })

  const diagnostics = transpile.diagnostics || []
  if (diagnostics.length === 0) {
    return [
      {
        id: 'TS_TRANSPILE',
        severity: 'info',
        status: 'pass',
        message: 'TypeScript/JavaScript transpile check passed.',
      },
    ]
  }

  return diagnostics.slice(0, 10).map((d, idx) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, ' ')
    return {
      id: `TS_DIAGNOSTIC_${idx + 1}`,
      severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      status: d.category === ts.DiagnosticCategory.Error ? 'fail' : 'warn',
      message,
    }
  })
}

export function validateAiChange(input: ValidateInput): ChangeValidationResult {
  const checks: ValidationCheck[] = []
  const source = typeof input.fullDocument === 'string' ? input.fullDocument : input.modified
  const language = detectLanguage(input.language, input.filePath)

  if (input.original === input.modified) {
    checks.push({
      id: 'NO_DIFF',
      severity: 'error',
      status: 'fail',
      message: 'Generated patch has no code changes.',
    })
  } else {
    checks.push({
      id: 'NO_DIFF',
      severity: 'info',
      status: 'pass',
      message: 'Patch changes detected.',
    })
  }

  if (source.length > MAX_DOCUMENT_SIZE) {
    checks.push({
      id: 'DOC_SIZE',
      severity: 'error',
      status: 'fail',
      message: `Document size exceeds validation ceiling (${MAX_DOCUMENT_SIZE} chars).`,
    })
  } else {
    checks.push({
      id: 'DOC_SIZE',
      severity: 'info',
      status: 'pass',
      message: 'Document size within validation limit.',
    })
  }

  if (language === 'json') {
    checks.push(...validateJson(source))
  } else if (
    language === 'typescript' ||
    language === 'typescriptreact' ||
    language === 'javascript' ||
    language === 'javascriptreact'
  ) {
    checks.push(...validateTsLike(source, language))
  } else {
    checks.push({
      id: 'LANG_RUNTIME',
      severity: 'warning',
      status: 'warn',
      message: `No deterministic parser configured for language "${language}".`,
    })
  }

  const dependencyImpact = extractImports(source)

  if (dependencyImpact.localImports.length > 40) {
    checks.push({
      id: 'LOCAL_IMPORT_FANOUT',
      severity: 'warning',
      status: 'warn',
      message: 'High local import fanout detected; consider project-level validation before apply.',
    })
  }

  const hasBlockingError = checks.some((check) => check.severity === 'error' && check.status === 'fail')

  return {
    canApply: !hasBlockingError,
    verdict: hasBlockingError ? 'APPLY_BLOCKED' : 'APPLY_ALLOWED',
    checks,
    dependencyImpact,
  }
}
