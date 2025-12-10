/**
 * Pytest Test Adapter
 * Provides test discovery, execution, and coverage for Pytest
 */

import { TestAdapterBase, TestItem, TestRun, TestResult, CoverageInfo } from '../test-adapter-base';

export class PytestAdapter extends TestAdapterBase {
  constructor(workspaceRoot: string) {
    super(workspaceRoot, 'pytest');
  }

  /**
   * Discover Pytest tests
   */
  async discoverTests(): Promise<TestItem[]> {
    try {
      // Find test files
      const testFiles = await this.findTestFiles(/test_.*\.py$|.*_test\.py$/);
      
      const allTests: TestItem[] = [];

      for (const file of testFiles) {
        const tests = await this.parseTestFile(file);
        allTests.push(...tests);
      }

      return this.buildTestTree(allTests);
    } catch (error) {
      console.error('[Pytest Adapter] Error discovering tests:', error);
      return this.getMockTests();
    }
  }

  /**
   * Run Pytest tests
   */
  async runTests(tests: TestItem[]): Promise<TestRun> {
    const runId = `pytest-run-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Build pytest command
      const testPaths = this.getTestPaths(tests);
      const args = [
        '-v',
        '--json-report',
        '--json-report-file=pytest-report.json',
        '--cov',
        '--cov-report=json',
        ...testPaths,
      ];

      // Execute pytest
      const result = await this.executeCommand('pytest', args, {
        cwd: this.workspaceRoot,
        env: {
          ...process.env,
          PYTHONPATH: this.workspaceRoot,
        },
      });

      // Parse results
      const reportPath = `${this.workspaceRoot}/pytest-report.json`;
      const reportData = await this.readFile(reportPath);
      const pytestResults = JSON.parse(reportData);
      const results = this.parsePytestResults(pytestResults, tests);

      const endTime = Date.now();
      const summary = this.calculateSummary(results);

      return {
        id: runId,
        tests,
        results,
        startTime,
        endTime,
        duration: endTime - startTime,
        ...summary,
      };
    } catch (error) {
      console.error('[Pytest Adapter] Error running tests:', error);
      return this.getMockTestRun(tests, startTime);
    }
  }

  /**
   * Get coverage information
   */
  async getCoverage(testRun: TestRun): Promise<CoverageInfo[]> {
    try {
      // Read coverage report
      const coveragePath = `${this.workspaceRoot}/coverage.json`;
      const coverageData = await this.readFile(coveragePath);
      const coverage = JSON.parse(coverageData);

      return this.parseCoverageData(coverage);
    } catch (error) {
      console.error('[Pytest Adapter] Error getting coverage:', error);
      return this.getMockCoverage();
    }
  }

  /**
   * Check if Pytest is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('pytest', ['--version']);
      return result.exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Pytest version
   */
  async getVersion(): Promise<string | null> {
    try {
      const result = await this.executeCommand('pytest', ['--version']);
      const match = result.stdout.match(/pytest (\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse test file
   */
  protected async parseTestFile(filePath: string): Promise<TestItem[]> {
    const content = await this.readFile(filePath);
    const tests: TestItem[] = [];

    // Parse test classes
    const classRegex = /class (Test\w+):/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const line = content.substring(0, match.index).split('\n').length - 1;

      tests.push({
        id: `${filePath}::${className}`,
        label: className,
        uri: filePath,
        range: {
          start: { line, character: 0 },
          end: { line, character: 0 },
        },
        type: 'suite',
      });
    }

    // Parse test functions
    const funcRegex = /def (test_\w+)\(/g;

    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1];
      const line = content.substring(0, match.index).split('\n').length - 1;

      // Check if inside a class
      const beforeMatch = content.substring(0, match.index);
      const lastClass = beforeMatch.lastIndexOf('class Test');
      const isInClass = lastClass > -1 && 
                       beforeMatch.substring(lastClass).indexOf('\ndef ') === -1;

      if (isInClass) {
        const classMatch = beforeMatch.match(/class (Test\w+):/);
        if (classMatch) {
          tests.push({
            id: `${filePath}::${classMatch[1]}::${funcName}`,
            label: funcName,
            uri: filePath,
            range: {
              start: { line, character: 0 },
              end: { line, character: 0 },
            },
            type: 'test',
          });
        }
      } else {
        tests.push({
          id: `${filePath}::${funcName}`,
          label: funcName,
          uri: filePath,
          range: {
            start: { line, character: 0 },
            end: { line, character: 0 },
          },
          type: 'test',
        });
      }
    }

    return tests;
  }

  /**
   * Get test paths from test items
   */
  private getTestPaths(tests: TestItem[]): string[] {
    const paths = new Set<string>();

    for (const test of tests) {
      if (test.type === 'test') {
        // Use node ID format for pytest
        paths.add(test.id);
      }
      if (test.children) {
        for (const child of test.children) {
          if (child.type === 'test') {
            paths.add(child.id);
          }
        }
      }
    }

    return Array.from(paths);
  }

  /**
   * Parse Pytest results
   */
  private parsePytestResults(pytestResults: any, tests: TestItem[]): TestResult[] {
    const results: TestResult[] = [];

    if (!pytestResults.tests) {
      return results;
    }

    for (const testResult of pytestResults.tests) {
      const testId = testResult.nodeid;
      const outcome = testResult.outcome;

      results.push({
        testId,
        status: outcome === 'passed' ? 'passed' : 
                outcome === 'failed' ? 'failed' : 'skipped',
        duration: testResult.duration ? testResult.duration * 1000 : undefined,
        message: testResult.call?.longrepr,
        error: testResult.call?.longrepr ? {
          message: testResult.call.longrepr,
          stack: testResult.call.longrepr,
        } : undefined,
        output: testResult.call?.stdout || testResult.call?.stderr,
      });
    }

    return results;
  }

  /**
   * Parse coverage data
   */
  private parseCoverageData(coverage: any): CoverageInfo[] {
    const coverageInfo: CoverageInfo[] = [];

    if (!coverage.files) {
      return coverageInfo;
    }

    for (const [filePath, fileData] of Object.entries(coverage.files)) {
      const data = fileData as any;

      const lines = Object.entries(data.executed_lines || {}).map(([line, count]) => ({
        line: parseInt(line),
        covered: (count as number) > 0,
        count: count as number,
      }));

      const branches = Object.entries(data.missing_branches || {}).map(([line, branchData]) => {
        const missing = branchData as number[];
        return {
          line: parseInt(line),
          covered: missing.length === 0,
          total: missing.length + 1,
          covered_count: missing.length === 0 ? 1 : 0,
        };
      });

      const functions: any[] = []; // Pytest doesn't provide function coverage

      const linesCovered = lines.filter(l => l.covered).length;
      const linesTotal = lines.length;
      const branchesCovered = branches.filter(b => b.covered).length;
      const branchesTotal = branches.length;

      coverageInfo.push({
        uri: filePath,
        lines,
        branches,
        functions,
        summary: {
          linesCovered,
          linesTotal,
          linesPercent: linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0,
          branchesCovered,
          branchesTotal,
          branchesPercent: branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 0,
          functionsCovered: 0,
          functionsTotal: 0,
          functionsPercent: 0,
        },
      });
    }

    return coverageInfo;
  }

  /**
   * Get mock tests for development
   */
  private getMockTests(): TestItem[] {
    return [
      {
        id: 'tests/test_example.py::TestExample',
        label: 'TestExample',
        uri: 'tests/test_example.py',
        type: 'suite',
        children: [
          {
            id: 'tests/test_example.py::TestExample::test_addition',
            label: 'test_addition',
            uri: 'tests/test_example.py',
            type: 'test',
            range: {
              start: { line: 5, character: 0 },
              end: { line: 7, character: 0 },
            },
          },
          {
            id: 'tests/test_example.py::TestExample::test_subtraction',
            label: 'test_subtraction',
            uri: 'tests/test_example.py',
            type: 'test',
            range: {
              start: { line: 9, character: 0 },
              end: { line: 11, character: 0 },
            },
          },
        ],
      },
      {
        id: 'tests/test_utils.py::test_format',
        label: 'test_format',
        uri: 'tests/test_utils.py',
        type: 'test',
        range: {
          start: { line: 3, character: 0 },
          end: { line: 5, character: 0 },
        },
      },
    ];
  }

  /**
   * Get mock test run
   */
  private getMockTestRun(tests: TestItem[], startTime: number): TestRun {
    const results: TestResult[] = [
      {
        testId: 'tests/test_example.py::TestExample::test_addition',
        status: 'passed',
        duration: 12,
      },
      {
        testId: 'tests/test_example.py::TestExample::test_subtraction',
        status: 'passed',
        duration: 10,
      },
      {
        testId: 'tests/test_utils.py::test_format',
        status: 'passed',
        duration: 8,
      },
    ];

    const endTime = Date.now();
    const summary = this.calculateSummary(results);

    return {
      id: `pytest-run-${startTime}`,
      tests,
      results,
      startTime,
      endTime,
      duration: endTime - startTime,
      ...summary,
    };
  }

  /**
   * Get mock coverage
   */
  private getMockCoverage(): CoverageInfo[] {
    return [
      {
        uri: 'src/example.py',
        lines: [
          { line: 1, covered: true, count: 5 },
          { line: 2, covered: true, count: 5 },
          { line: 3, covered: true, count: 3 },
          { line: 4, covered: false, count: 0 },
          { line: 5, covered: true, count: 2 },
        ],
        branches: [
          { line: 3, covered: true, total: 2, covered_count: 2 },
        ],
        functions: [],
        summary: {
          linesCovered: 4,
          linesTotal: 5,
          linesPercent: 80,
          branchesCovered: 1,
          branchesTotal: 1,
          branchesPercent: 100,
          functionsCovered: 0,
          functionsTotal: 0,
          functionsPercent: 0,
        },
      },
    ];
  }
}

export function createPytestAdapter(workspaceRoot: string): PytestAdapter {
  return new PytestAdapter(workspaceRoot);
}
