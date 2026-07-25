/**
 * L.5 — Project-level TypeScript gate (Focus 1A / Auto-Heal)
 * Single-file transpile is not enough: overlay changed files into a mini program
 * and fail-closed on semantic errors before apply / heal PASS.
 */

import * as ts from 'typescript'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ProjectValidationGateResult } from './auto-heal-loop'

const log = createComponentLogger('project-l5-typecheck')

export interface L5VirtualFile {
  /** Absolute or workspace-virtual path used as TS fileName */
  fileName: string
  content: string
}

export interface ProjectL5TypecheckInput {
  files: L5VirtualFile[]
  /** Additional read-only files (imports) available to the program */
  ambientFiles?: L5VirtualFile[]
  compilerOptions?: ts.CompilerOptions
  /** Max diagnostics surfaced in compilerLog */
  maxDiagnostics?: number
}

function normalizeFileName(fileName: string): string {
  return fileName.replace(/\\/g, '/').replace(/^\/+/, '')
}

function defaultCompilerOptions(): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    resolveJsonModule: true,
    // Avoid pulling real node_modules in unit tests / sandbox overlays
    types: [],
    lib: ['es2022', 'dom'],
  }
}

function isTsLike(fileName: string): boolean {
  return /\.(tsx?|jsx?)$/i.test(fileName)
}

/**
 * Run an in-memory TypeScript program over virtual overlays.
 * Does not spawn `tsc` CLI (sandbox-safe, deterministic).
 */
export function runProjectL5Typecheck(input: ProjectL5TypecheckInput): ProjectValidationGateResult {
  const maxDiagnostics = input.maxDiagnostics ?? 40
  const files = input.files.filter((f) => isTsLike(f.fileName) && f.content != null)
  if (files.length === 0) {
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'L5_SKIP_NON_TS', status: 'pass', message: 'No TS/JS files in overlay — L.5 skipped' }],
    }
  }

  const virtual = new Map<string, string>()
  for (const f of [...(input.ambientFiles ?? []), ...files]) {
    virtual.set(normalizeFileName(f.fileName), f.content)
  }

  const rootNames = files.map((f) => normalizeFileName(f.fileName))
  const options = { ...defaultCompilerOptions(), ...(input.compilerOptions ?? {}) }

  const host: ts.CompilerHost = {
    ...ts.createCompilerHost(options, true),
    getSourceFile(fileName, languageVersion, onError) {
      const key = normalizeFileName(fileName)
      const content = virtual.get(key)
      if (content !== undefined) {
        return ts.createSourceFile(key, content, languageVersion, true)
      }
      // Real disk first — this is how TS default lib files (lib.dom.d.ts,
      // lib.es2022.d.ts, etc.) get loaded. Without this, `console`, `Promise`,
      // `fetch`, and every other stdlib/DOM global would silently vanish and
      // any real-world file using them would false-fail L.5 typecheck.
      const diskCandidates = [fileName]
      // TS's host-driven `createProgram` (unlike the `tsc` CLI path) probes
      // default-lib `lib` compiler-option entries (e.g. "es2022", "dom")
      // against the lib directory WITHOUT the real `lib.` filename prefix
      // (actual files on disk are `lib.es2022.d.ts`, `lib.dom.d.ts`, ...).
      // Try that canonical candidate too before falling back to a stub.
      const slash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'))
      const dir = slash >= 0 ? fileName.slice(0, slash + 1) : ''
      const base = slash >= 0 ? fileName.slice(slash + 1) : fileName
      if (!base.startsWith('lib.')) {
        diskCandidates.push(`${dir}lib.${base}`)
      }
      for (const candidate of diskCandidates) {
        try {
          const real = ts.sys.readFile(candidate)
          if (real !== undefined) {
            return ts.createSourceFile(key, real, languageVersion, true)
          }
        } catch {
          // try next candidate
        }
      }
      // Missing ambient import (not a real lib file) → synthetic stub module
      // so we don't fail on unresolved local .d.ts paths alone.
      if (key.endsWith('.d.ts')) {
        return ts.createSourceFile(key, 'export {}', languageVersion, true)
      }
      return undefined
    },
    fileExists(fileName) {
      const key = normalizeFileName(fileName)
      if (virtual.has(key)) return true
      try {
        return ts.sys.fileExists(fileName)
      } catch {
        return false
      }
    },
    readFile(fileName) {
      const key = normalizeFileName(fileName)
      if (virtual.has(key)) return virtual.get(key)
      try {
        return ts.sys.readFile(fileName)
      } catch {
        return undefined
      }
    },
    writeFile() {
      /* noEmit */
    },
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (f) => normalizeFileName(f),
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  }

  const program = ts.createProgram({ rootNames, options, host })
  const diagnostics = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ].filter((d) => d.category === ts.DiagnosticCategory.Error)

  if (diagnostics.length === 0) {
    log.info('l5_typecheck_pass', { roots: rootNames.length })
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'L5_PROJECT_TYPECHECK', status: 'pass', message: 'Project L.5 typecheck passed' }],
    }
  }

  const lines = diagnostics.slice(0, maxDiagnostics).map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
    const file = d.file?.fileName ?? 'unknown'
    if (d.file && typeof d.start === 'number') {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start)
      return `${file}(${line + 1},${character + 1}): error TS${d.code}: ${msg}`
    }
    return `${file}: error TS${d.code}: ${msg}`
  })

  const compilerLog = lines.join('\n')
  log.warn('l5_typecheck_fail', { errors: diagnostics.length, sample: lines[0] })

  return {
    verdict: 'FAIL',
    compilerLog,
    checks: [
      {
        id: 'L5_PROJECT_TYPECHECK',
        status: 'fail',
        message: `${diagnostics.length} TypeScript error(s) — Auto-Heal may reinject compilerLog`,
      },
    ],
  }
}

/**
 * Convenience: validate a single patched document with optional ambient siblings.
 */
export function validateDocumentWithProjectL5(input: {
  filePath: string
  content: string
  ambientFiles?: L5VirtualFile[]
}): ProjectValidationGateResult {
  if (!isTsLike(input.filePath)) {
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'L5_SKIP_NON_TS', status: 'pass', message: 'Non-TS path — L.5 skipped' }],
    }
  }
  return runProjectL5Typecheck({
    files: [{ fileName: input.filePath, content: input.content }],
    ambientFiles: input.ambientFiles,
  })
}
