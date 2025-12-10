/**
 * Base class for test adapters
 * Provides common functionality for test discovery, execution, and coverage
 */

export interface TestItem {
  id: string;
  label: string;
  uri: string;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: TestItem[];
  type: 'suite' | 'test';
  tags?: string[];
}

export interface TestRun {
  id: string;
  tests: TestItem[];
  results: TestResult[];
  startTime: number;
  endTime?: number;
  duration?: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface TestResult {
  testId: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration?: number;
  message?: string;
  error?: {
    message: string;
    stack?: string;
    expected?: string;
    actual?: string;
  };
  output?: string;
}

export interface CoverageInfo {
  uri: string;
  lines: {
    line: number;
    covered: boolean;
    count: number;
  }[];
  branches: {
    line: number;
    covered: boolean;
    total: number;
    covered_count: number;
  }[];
  functions: {
    name: string;
    line: number;
    covered: boolean;
  }[];
  summary: {
    linesCovered: number;
    linesTotal: number;
    linesPercent: number;
    branchesCovered: number;
    branchesTotal: number;
    branchesPercent: number;
    functionsCovered: number;
    functionsTotal: number;
    functionsPercent: number;
  };
}

export abstract class TestAdapterBase {
  protected workspaceRoot: string;
  protected framework: string;

  constructor(workspaceRoot: string, framework: string) {
    this.workspaceRoot = workspaceRoot;
    this.framework = framework;
  }

  /**
   * Discover tests in workspace
   */
  abstract discoverTests(): Promise<TestItem[]>;

  /**
   * Run tests
   */
  abstract runTests(tests: TestItem[]): Promise<TestRun>;

  /**
   * Get coverage information
   */
  abstract getCoverage(testRun: TestRun): Promise<CoverageInfo[]>;

  /**
   * Check if framework is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Get framework version
   */
  abstract getVersion(): Promise<string | null>;

  /**
   * Parse test file to extract tests
   */
  protected abstract parseTestFile(filePath: string): Promise<TestItem[]>;

  /**
   * Build test tree from flat list
   */
  protected buildTestTree(tests: TestItem[]): TestItem[] {
    const tree: TestItem[] = [];
    const suiteMap = new Map<string, TestItem>();

    // Group tests by suite
    for (const test of tests) {
      if (test.type === 'suite') {
        suiteMap.set(test.id, test);
        tree.push(test);
      }
    }

    // Add tests to suites
    for (const test of tests) {
      if (test.type === 'test') {
        const suitePath = this.getSuitePath(test.id);
        const suite = suiteMap.get(suitePath);
        if (suite) {
          if (!suite.children) {
            suite.children = [];
          }
          suite.children.push(test);
        } else {
          tree.push(test);
        }
      }
    }

    return tree;
  }

  /**
   * Get suite path from test ID
   */
  protected getSuitePath(testId: string): string {
    const parts = testId.split('::');
    return parts.slice(0, -1).join('::');
  }

  /**
   * Calculate test run summary
   */
  protected calculateSummary(results: TestResult[]): {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  } {
    const summary = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: results.length,
    };

    for (const result of results) {
      switch (result.status) {
        case 'passed':
          summary.passed++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'skipped':
          summary.skipped++;
          break;
      }
    }

    return summary;
  }

  /**
   * Find test files
   */
  protected async findTestFiles(pattern: RegExp): Promise<string[]> {
    // Mock implementation - will be replaced with real file system access
    console.log(`[Test Adapter] Finding test files matching: ${pattern}`);
    return [];
  }

  /**
   * Read file content
   */
  protected async readFile(filePath: string): Promise<string> {
    // Mock implementation - will be replaced with real file system access
    console.log(`[Test Adapter] Reading file: ${filePath}`);
    return '';
  }

  /**
   * Execute command
   */
  protected async executeCommand(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // Mock implementation - will be replaced with real command execution
    console.log(`[Test Adapter] Executing: ${command} ${args.join(' ')}`);
    return {
      stdout: '',
      stderr: '',
      exitCode: 0,
    };
  }

  /**
   * Get framework name
   */
  getFramework(): string {
    return this.framework;
  }

  /**
   * Get workspace root
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}
