/**
 * Minimal ambient typing for the `eslint` package's Node API surface used by
 * `lib/production/project-l5-lint.ts` (Law XI L.5 lint gate).
 *
 * The installed `eslint@8.57.1` does not ship its own TypeScript declarations
 * and this monorepo's workspace/lockfile hoisting is fragile (adding
 * `@types/eslint` as an npm dependency has previously forced an unrelated
 * full dependency re-resolution). A scoped ambient module — covering only the
 * constructor + `lintText` + `LintResult` shape actually consumed — avoids
 * touching package.json/package-lock.json entirely.
 */
declare module 'eslint' {
  export namespace ESLint {
    interface Options {
      cwd?: string
      useEslintrc?: boolean
      errorOnUnmatchedPattern?: boolean
      [key: string]: unknown
    }

    interface LintMessage {
      ruleId: string | null
      severity: 0 | 1 | 2
      message: string
      line?: number
      column?: number
      endLine?: number
      endColumn?: number
    }

    interface LintResult {
      filePath: string
      messages: LintMessage[]
      errorCount: number
      warningCount: number
      [key: string]: unknown
    }

    interface LintTextOptions {
      filePath?: string
      [key: string]: unknown
    }
  }

  export class ESLint {
    constructor(options?: ESLint.Options)
    lintText(code: string, options?: ESLint.LintTextOptions): Promise<ESLint.LintResult[]>
  }
}
