/**
 * Problem Matchers
 * Parse build output to extract errors, warnings, and other problems
 */

export interface Problem {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  code?: string;
  source?: string;
}

export interface ProblemPattern {
  regexp: RegExp;
  file?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  message: number;
}

export interface ProblemMatcher {
  name: string;
  owner: string;
  pattern: ProblemPattern | ProblemPattern[];
  fileLocation?: 'absolute' | 'relative';
  background?: {
    activeOnStart?: boolean;
    beginsPattern?: RegExp;
    endsPattern?: RegExp;
  };
}

/**
 * TypeScript Problem Matcher
 */
export const tscProblemMatcher: ProblemMatcher = {
  name: 'tsc',
  owner: 'typescript',
  fileLocation: 'relative',
  pattern: {
    regexp: /^(.+)\((\d+),(\d+)\):\s+(error|warning|info)\s+TS(\d+):\s+(.+)$/,
    file: 1,
    line: 2,
    column: 3,
    severity: 4,
    code: 5,
    message: 6,
  },
};

/**
 * ESLint Problem Matcher
 */
export const eslintProblemMatcher: ProblemMatcher = {
  name: 'eslint-stylish',
  owner: 'eslint',
  fileLocation: 'relative',
  pattern: [
    {
      regexp: /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(.+)$/,
      line: 1,
      column: 2,
      severity: 3,
      message: 4,
      code: 5,
    },
  ],
};

/**
 * Python Problem Matcher
 */
export const pythonProblemMatcher: ProblemMatcher = {
  name: 'python',
  owner: 'python',
  fileLocation: 'absolute',
  pattern: {
    regexp: /^\s*File "(.+)", line (\d+).*$/,
    file: 1,
    line: 2,
    message: 0,
  },
};

/**
 * Pylint Problem Matcher
 */
export const pylintProblemMatcher: ProblemMatcher = {
  name: 'pylint',
  owner: 'pylint',
  fileLocation: 'relative',
  pattern: {
    regexp: /^(.+):(\d+):(\d+):\s+([CEFRW]\d+):\s+(.+)$/,
    file: 1,
    line: 2,
    column: 3,
    code: 4,
    message: 5,
  },
};

/**
 * Go Problem Matcher
 */
export const goProblemMatcher: ProblemMatcher = {
  name: 'go',
  owner: 'go',
  fileLocation: 'relative',
  pattern: {
    regexp: /^(.+):(\d+):(\d+):\s+(.+)$/,
    file: 1,
    line: 2,
    column: 3,
    message: 4,
  },
};

/**
 * Rust Problem Matcher
 */
export const rustcProblemMatcher: ProblemMatcher = {
  name: 'rustc',
  owner: 'rust',
  fileLocation: 'relative',
  pattern: [
    {
      regexp: /^(error|warning)(\[E\d+\])?:\s+(.+)$/,
      severity: 1,
      code: 2,
      message: 3,
    },
    {
      regexp: /^\s+-->\s+(.+):(\d+):(\d+)$/,
      file: 1,
      line: 2,
      column: 3,
    },
  ],
};

/**
 * GCC Problem Matcher
 */
export const gccProblemMatcher: ProblemMatcher = {
  name: 'gcc',
  owner: 'gcc',
  fileLocation: 'relative',
  pattern: {
    regexp: /^(.+):(\d+):(\d+):\s+(error|warning|note):\s+(.+)$/,
    file: 1,
    line: 2,
    column: 3,
    severity: 4,
    message: 5,
  },
};

/**
 * Maven Problem Matcher
 */
export const mavenProblemMatcher: ProblemMatcher = {
  name: 'maven',
  owner: 'maven',
  fileLocation: 'relative',
  pattern: {
    regexp: /^\[ERROR\]\s+(.+):\[(\d+),(\d+)\]\s+(.+)$/,
    file: 1,
    line: 2,
    column: 3,
    message: 4,
  },
};

/**
 * Gradle Problem Matcher
 */
export const gradleProblemMatcher: ProblemMatcher = {
  name: 'gradle',
  owner: 'gradle',
  fileLocation: 'relative',
  pattern: {
    regexp: /^(.+):(\d+):\s+(error|warning):\s+(.+)$/,
    file: 1,
    line: 2,
    severity: 3,
    message: 4,
  },
};

/**
 * Jest Problem Matcher
 */
export const jestProblemMatcher: ProblemMatcher = {
  name: 'jest',
  owner: 'jest',
  fileLocation: 'relative',
  pattern: {
    regexp: /^\s+●\s+(.+)\s+›\s+(.+)$/,
    message: 0,
  },
};

/**
 * Pytest Problem Matcher
 */
export const pytestProblemMatcher: ProblemMatcher = {
  name: 'pytest',
  owner: 'pytest',
  fileLocation: 'relative',
  pattern: {
    regexp: /^(.+):(\d+):\s+(.+)$/,
    file: 1,
    line: 2,
    message: 3,
  },
};

/**
 * Problem Matcher Registry
 */
export class ProblemMatcherRegistry {
  private matchers: Map<string, ProblemMatcher> = new Map();

  constructor() {
    // Register built-in matchers
    this.register(tscProblemMatcher);
    this.register(eslintProblemMatcher);
    this.register(pythonProblemMatcher);
    this.register(pylintProblemMatcher);
    this.register(goProblemMatcher);
    this.register(rustcProblemMatcher);
    this.register(gccProblemMatcher);
    this.register(mavenProblemMatcher);
    this.register(gradleProblemMatcher);
    this.register(jestProblemMatcher);
    this.register(pytestProblemMatcher);
  }

  /**
   * Register a problem matcher
   */
  register(matcher: ProblemMatcher): void {
    this.matchers.set(matcher.name, matcher);
    console.log(`[Problem Matcher] Registered: ${matcher.name}`);
  }

  /**
   * Get problem matcher by name
   */
  get(name: string): ProblemMatcher | undefined {
    // Handle $name format
    const matcherName = name.startsWith('$') ? name.substring(1) : name;
    return this.matchers.get(matcherName);
  }

  /**
   * Get all registered matchers
   */
  getAll(): ProblemMatcher[] {
    return Array.from(this.matchers.values());
  }

  /**
   * Parse output with matcher
   */
  parse(output: string, matcherName: string, workspaceRoot?: string): Problem[] {
    const matcher = this.get(matcherName);
    if (!matcher) {
      console.warn(`[Problem Matcher] Matcher not found: ${matcherName}`);
      return [];
    }

    return this.parseWithMatcher(output, matcher, workspaceRoot);
  }

  /**
   * Parse output with multiple matchers
   */
  parseWithMatchers(output: string, matcherNames: string[], workspaceRoot?: string): Problem[] {
    const allProblems: Problem[] = [];

    for (const matcherName of matcherNames) {
      const problems = this.parse(output, matcherName, workspaceRoot);
      allProblems.push(...problems);
    }

    return allProblems;
  }

  /**
   * Parse output with a specific matcher
   */
  private parseWithMatcher(
    output: string,
    matcher: ProblemMatcher,
    workspaceRoot?: string
  ): Problem[] {
    const problems: Problem[] = [];
    const lines = output.split('\n');

    const patterns = Array.isArray(matcher.pattern) ? matcher.pattern : [matcher.pattern];

    if (patterns.length === 1) {
      // Single pattern matcher
      const pattern = patterns[0];
      for (const line of lines) {
        const match = line.match(pattern.regexp);
        if (match) {
          const problem = this.extractProblem(match, pattern, matcher, workspaceRoot);
          if (problem) {
            problems.push(problem);
          }
        }
      }
    } else {
      // Multi-pattern matcher (e.g., Rust)
      let currentProblem: Partial<Problem> | null = null;

      for (const line of lines) {
        for (let i = 0; i < patterns.length; i++) {
          const pattern = patterns[i];
          const match = line.match(pattern.regexp);

          if (match) {
            if (i === 0) {
              // First pattern - start new problem
              currentProblem = this.extractProblem(match, pattern, matcher, workspaceRoot);
            } else if (currentProblem) {
              // Subsequent patterns - add to current problem
              const extracted = this.extractProblem(match, pattern, matcher, workspaceRoot);
              if (extracted) {
                Object.assign(currentProblem, extracted);
                
                // If we have all required fields, add to problems
                if (currentProblem.message && currentProblem.file) {
                  problems.push(currentProblem as Problem);
                  currentProblem = null;
                }
              }
            }
            break;
          }
        }
      }
    }

    return problems;
  }

  /**
   * Extract problem from regex match
   */
  private extractProblem(
    match: RegExpMatchArray,
    pattern: ProblemPattern,
    matcher: ProblemMatcher,
    workspaceRoot?: string
  ): Problem | null {
    const problem: Partial<Problem> = {
      source: matcher.owner,
    };

    // Extract message (required)
    if (pattern.message !== undefined) {
      problem.message = match[pattern.message] || match[0];
    } else {
      problem.message = match[0];
    }

    // Extract file
    if (pattern.file !== undefined && match[pattern.file]) {
      let file = match[pattern.file];
      
      // Handle file location
      if (matcher.fileLocation === 'relative' && workspaceRoot) {
        file = `${workspaceRoot}/${file}`;
      }
      
      problem.file = file;
    }

    // Extract line
    if (pattern.line !== undefined && match[pattern.line]) {
      problem.line = parseInt(match[pattern.line]);
    }

    // Extract column
    if (pattern.column !== undefined && match[pattern.column]) {
      problem.column = parseInt(match[pattern.column]);
    }

    // Extract end line
    if (pattern.endLine !== undefined && match[pattern.endLine]) {
      problem.endLine = parseInt(match[pattern.endLine]);
    }

    // Extract end column
    if (pattern.endColumn !== undefined && match[pattern.endColumn]) {
      problem.endColumn = parseInt(match[pattern.endColumn]);
    }

    // Extract severity
    if (pattern.severity !== undefined && match[pattern.severity]) {
      const severityStr = match[pattern.severity].toLowerCase();
      if (severityStr.includes('error')) {
        problem.severity = 'error';
      } else if (severityStr.includes('warning')) {
        problem.severity = 'warning';
      } else {
        problem.severity = 'info';
      }
    } else {
      // Default severity
      problem.severity = 'error';
    }

    // Extract code
    if (pattern.code !== undefined && match[pattern.code]) {
      problem.code = match[pattern.code];
    }

    return problem.message ? (problem as Problem) : null;
  }
}

// Singleton instance
let problemMatcherRegistryInstance: ProblemMatcherRegistry | null = null;

export function getProblemMatcherRegistry(): ProblemMatcherRegistry {
  if (!problemMatcherRegistryInstance) {
    problemMatcherRegistryInstance = new ProblemMatcherRegistry();
  }
  return problemMatcherRegistryInstance;
}
