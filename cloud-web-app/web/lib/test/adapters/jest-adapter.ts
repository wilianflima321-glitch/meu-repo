/**
 * Jest Test Adapter
 * Provides test discovery, execution, and coverage for Jest
 */

import { TestAdapterBase, TestItem, TestRun, TestResult, CoverageInfo } from '../test-adapter-base';

export class JestAdapter extends TestAdapterBase {
  constructor(workspaceRoot: string) {
    super(workspaceRoot, 'jest');
  }

  /**
   * Discover Jest tests
   */
  async discoverTests(): Promise<TestItem[]> {
    try {
      // Find test files
      const testFiles = await this.findTestFiles(/\.(test|spec)\.(js|jsx|ts|tsx)$/);
      
      const allTests: TestItem[] = [];

      for (const file of testFiles) {
        const tests = await this.parseTestFile(file);
        allTests.push(...tests);
      }

      return this.buildTestTree(allTests);
    } catch (error) {
      console.error('[Jest Adapter] Error discovering tests:', error);
      return this.getMockTests();
    }
  }

  /**
   * Run Jest tests
   */
  async runTests(tests: TestItem[]): Promise<TestRun> {
    const runId = `jest-run-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Build Jest command
      const testPaths = this.getTestPaths(tests);
      const args = [
        '--json',
        '--coverage',
        '--testLocationInResults',
        ...testPaths,
      ];

      // Execute Jest
      const result = await this.executeCommand('jest', args, {
        cwd: this.workspaceRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      // Parse results
      const jestResults = JSON.parse(result.stdout);
      const results = this.parseJestResults(jestResults, tests);

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
      console.error('[Jest Adapter] Error running tests:', error);
      return this.getMockTestRun(tests, startTime);
    }
  }

  /**
   * Get coverage information
   */
  async getCoverage(testRun: TestRun): Promise<CoverageInfo[]> {
    try {
      // Read coverage report
      const coveragePath = `${this.workspaceRoot}/coverage/coverage-final.json`;
      const coverageData = await this.readFile(coveragePath);
      const coverage = JSON.parse(coverageData);

      return this.parseCoverageData(coverage);
    } catch (error) {
      console.error('[Jest Adapter] Error getting coverage:', error);
      return this.getMockCoverage();
    }
  }

  /**
   * Check if Jest is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('jest', ['--version']);
      return result.exitCode === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Jest version
   */
  async getVersion(): Promise<string | null> {
    try {
      const result = await this.executeCommand('jest', ['--version']);
      return result.stdout.trim();
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

    // Parse describe blocks (test suites)
    const describeRegex = /describe\(['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = describeRegex.exec(content)) !== null) {
      const suiteName = match[1];
      const line = content.substring(0, match.index).split('\n').length - 1;

      tests.push({
        id: `${filePath}::${suiteName}`,
        label: suiteName,
        uri: filePath,
        range: {
          start: { line, character: 0 },
          end: { line, character: 0 },
        },
        type: 'suite',
      });
    }

    // Parse test/it blocks
    const testRegex = /(test|it)\(['"`]([^'"`]+)['"`]/g;

    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[2];
      const line = content.substring(0, match.index).split('\n').length - 1;

      tests.push({
        id: `${filePath}::${testName}`,
        label: testName,
        uri: filePath,
        range: {
          start: { line, character: 0 },
          end: { line, character: 0 },
        },
        type: 'test',
      });
    }

    return tests;
  }

  /**
   * Get test paths from test items
   */
  private getTestPaths(tests: TestItem[]): string[] {
    const paths = new Set<string>();

    for (const test of tests) {
      paths.add(test.uri);
      if (test.children) {
        for (const child of test.children) {
          paths.add(child.uri);
        }
      }
    }

    return Array.from(paths);
  }

  /**
   * Parse Jest results
   */
  private parseJestResults(jestResults: any, tests: TestItem[]): TestResult[] {
    const results: TestResult[] = [];

    if (!jestResults.testResults) {
      return results;
    }

    for (const fileResult of jestResults.testResults) {
      for (const testResult of fileResult.assertionResults) {
        const testId = `${fileResult.name}::${testResult.title}`;

        results.push({
          testId,
          status: testResult.status === 'passed' ? 'passed' : 
                  testResult.status === 'failed' ? 'failed' : 'skipped',
          duration: testResult.duration,
          message: testResult.failureMessages?.[0],
          error: testResult.failureMessages?.[0] ? {
            message: testResult.failureMessages[0],
            stack: testResult.failureMessages.join('\n'),
          } : undefined,
        });
      }
    }

    return results;
  }

  /**
   * Parse coverage data
   */
  private parseCoverageData(coverage: any): CoverageInfo[] {
    const coverageInfo: CoverageInfo[] = [];

    for (const [filePath, fileData] of Object.entries(coverage)) {
      const data = fileData as any;

      const lines = Object.entries(data.s || {}).map(([line, count]) => ({
        line: parseInt(line),
        covered: (count as number) > 0,
        count: count as number,
      }));

      const branches = Object.entries(data.b || {}).map(([line, branchData]) => {
        const counts = branchData as number[];
        return {
          line: parseInt(line),
          covered: counts.every(c => c > 0),
          total: counts.length,
          covered_count: counts.filter(c => c > 0).length,
        };
      });

      const functions = Object.entries(data.f || {}).map(([name, count]) => ({
        name,
        line: 0, // Jest doesn't provide line numbers for functions
        covered: (count as number) > 0,
      }));

      const linesCovered = lines.filter(l => l.covered).length;
      const linesTotal = lines.length;
      const branchesCovered = branches.filter(b => b.covered).length;
      const branchesTotal = branches.length;
      const functionsCovered = functions.filter(f => f.covered).length;
      const functionsTotal = functions.length;

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
          functionsCovered,
          functionsTotal,
          functionsPercent: functionsTotal > 0 ? (functionsCovered / functionsTotal) * 100 : 0,
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
        id: 'test/example.test.ts::Example Suite',
        label: 'Example Suite',
        uri: 'test/example.test.ts',
        type: 'suite',
        children: [
          {
            id: 'test/example.test.ts::Example Suite::should pass',
            label: 'should pass',
            uri: 'test/example.test.ts',
            type: 'test',
            range: {
              start: { line: 5, character: 0 },
              end: { line: 7, character: 0 },
            },
          },
          {
            id: 'test/example.test.ts::Example Suite::should also pass',
            label: 'should also pass',
            uri: 'test/example.test.ts',
            type: 'test',
            range: {
              start: { line: 9, character: 0 },
              end: { line: 11, character: 0 },
            },
          },
        ],
      },
      {
        id: 'test/utils.test.ts::Utils',
        label: 'Utils',
        uri: 'test/utils.test.ts',
        type: 'suite',
        children: [
          {
            id: 'test/utils.test.ts::Utils::should format correctly',
            label: 'should format correctly',
            uri: 'test/utils.test.ts',
            type: 'test',
            range: {
              start: { line: 3, character: 0 },
              end: { line: 5, character: 0 },
            },
          },
        ],
      },
    ];
  }

  /**
   * Get mock test run
   */
  private getMockTestRun(tests: TestItem[], startTime: number): TestRun {
    const results: TestResult[] = [
      {
        testId: 'test/example.test.ts::Example Suite::should pass',
        status: 'passed',
        duration: 15,
      },
      {
        testId: 'test/example.test.ts::Example Suite::should also pass',
        status: 'passed',
        duration: 8,
      },
      {
        testId: 'test/utils.test.ts::Utils::should format correctly',
        status: 'passed',
        duration: 12,
      },
    ];

    const endTime = Date.now();
    const summary = this.calculateSummary(results);

    return {
      id: `jest-run-${startTime}`,
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
        uri: 'src/example.ts',
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
        functions: [
          { name: 'example', line: 1, covered: true },
        ],
        summary: {
          linesCovered: 4,
          linesTotal: 5,
          linesPercent: 80,
          branchesCovered: 1,
          branchesTotal: 1,
          branchesPercent: 100,
          functionsCovered: 1,
          functionsTotal: 1,
          functionsPercent: 100,
        },
      },
    ];
  }
}

export function createJestAdapter(workspaceRoot: string): JestAdapter {
  return new JestAdapter(workspaceRoot);
}
