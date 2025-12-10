/**
 * Test Manager
 * Manages test discovery, execution, and coverage
 */

export interface TestItem {
  id: string;
  label: string;
  type: 'file' | 'suite' | 'test';
  uri?: string;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  children?: TestItem[];
  parent?: string;
}

export interface TestRun {
  id: string;
  startTime: Date;
  endTime?: Date;
  results: Map<string, TestResult>;
}

export interface TestResult {
  testId: string;
  state: 'passed' | 'failed' | 'skipped' | 'errored';
  duration?: number;
  message?: string;
  stack?: string;
  output?: string;
}

export interface TestCoverage {
  uri: string;
  lines: {
    total: number;
    covered: number;
    uncovered: number[];
  };
  branches?: {
    total: number;
    covered: number;
  };
  functions?: {
    total: number;
    covered: number;
  };
  statements?: {
    total: number;
    covered: number;
  };
}

export interface TestAdapter {
  id: string;
  label: string;
  filePattern: RegExp;
  discover: (workspaceRoot: string) => Promise<TestItem[]>;
  run: (testIds: string[], workspaceRoot: string) => Promise<TestRun>;
  debug?: (testId: string, workspaceRoot: string) => Promise<void>;
  coverage?: (workspaceRoot: string) => Promise<TestCoverage[]>;
}

export class TestManager {
  private adapters: Map<string, TestAdapter> = new Map();
  private testItems: Map<string, TestItem> = new Map();
  private testRuns: Map<string, TestRun> = new Map();
  private coverage: Map<string, TestCoverage> = new Map();

  registerAdapter(adapter: TestAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  async discoverTests(workspaceRoot: string): Promise<TestItem[]> {
    const allTests: TestItem[] = [];

    for (const adapter of this.adapters.values()) {
      try {
        const tests = await adapter.discover(workspaceRoot);
        allTests.push(...tests);

        // Index tests
        for (const test of tests) {
          this.indexTestItem(test);
        }
      } catch (error) {
        console.error(`Failed to discover tests with ${adapter.id}:`, error);
      }
    }

    return allTests;
  }

  async runTests(testIds: string[], workspaceRoot: string): Promise<TestRun> {
    // Group tests by adapter
    const testsByAdapter = new Map<string, string[]>();

    for (const testId of testIds) {
      const test = this.testItems.get(testId);
      if (!test) continue;

      const adapterId = this.getAdapterForTest(test);
      if (!adapterId) continue;

      if (!testsByAdapter.has(adapterId)) {
        testsByAdapter.set(adapterId, []);
      }
      testsByAdapter.get(adapterId)!.push(testId);
    }

    // Run tests with each adapter
    const runId = `run_${Date.now()}`;
    const run: TestRun = {
      id: runId,
      startTime: new Date(),
      results: new Map()
    };

    for (const [adapterId, ids] of testsByAdapter.entries()) {
      const adapter = this.adapters.get(adapterId);
      if (!adapter) continue;

      try {
        const adapterRun = await adapter.run(ids, workspaceRoot);
        
        // Merge results
        for (const [testId, result] of adapterRun.results.entries()) {
          run.results.set(testId, result);
        }
      } catch (error) {
        console.error(`Failed to run tests with ${adapterId}:`, error);
      }
    }

    run.endTime = new Date();
    this.testRuns.set(runId, run);

    return run;
  }

  async debugTest(testId: string, workspaceRoot: string): Promise<void> {
    const test = this.testItems.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const adapterId = this.getAdapterForTest(test);
    if (!adapterId) {
      throw new Error(`No adapter found for test: ${testId}`);
    }

    const adapter = this.adapters.get(adapterId);
    if (!adapter || !adapter.debug) {
      throw new Error(`Adapter ${adapterId} does not support debugging`);
    }

    await adapter.debug(testId, workspaceRoot);
  }

  async getCoverage(workspaceRoot: string): Promise<TestCoverage[]> {
    const allCoverage: TestCoverage[] = [];

    for (const adapter of this.adapters.values()) {
      if (!adapter.coverage) continue;

      try {
        const coverage = await adapter.coverage(workspaceRoot);
        allCoverage.push(...coverage);

        // Index coverage
        for (const cov of coverage) {
          this.coverage.set(cov.uri, cov);
        }
      } catch (error) {
        console.error(`Failed to get coverage from ${adapter.id}:`, error);
      }
    }

    return allCoverage;
  }

  getTest(id: string): TestItem | undefined {
    return this.testItems.get(id);
  }

  getAllTests(): TestItem[] {
    return Array.from(this.testItems.values()).filter(t => !t.parent);
  }

  getTestRun(id: string): TestRun | undefined {
    return this.testRuns.get(id);
  }

  getLatestTestRun(): TestRun | undefined {
    const runs = Array.from(this.testRuns.values());
    if (runs.length === 0) return undefined;
    return runs.reduce((latest, run) => 
      run.startTime > latest.startTime ? run : latest
    );
  }

  getCoverageForFile(uri: string): TestCoverage | undefined {
    return this.coverage.get(uri);
  }

  private indexTestItem(item: TestItem): void {
    this.testItems.set(item.id, item);
    if (item.children) {
      for (const child of item.children) {
        this.indexTestItem(child);
      }
    }
  }

  private getAdapterForTest(test: TestItem): string | undefined {
    // Determine adapter based on test URI or type
    if (!test.uri) return undefined;

    for (const [id, adapter] of this.adapters.entries()) {
      if (adapter.filePattern.test(test.uri)) {
        return id;
      }
    }

    return undefined;
  }
}

// Built-in test adapters

export const JestAdapter: TestAdapter = {
  id: 'jest',
  label: 'Jest',
  filePattern: /\.(test|spec)\.(js|jsx|ts|tsx)$/,
  
  async discover(workspaceRoot: string): Promise<TestItem[]> {
    const response = await fetch('/api/test/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'jest', workspaceRoot })
    });

    const data = await response.json();
    return data.tests || [];
  },

  async run(testIds: string[], workspaceRoot: string): Promise<TestRun> {
    const response = await fetch('/api/test/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'jest', testIds, workspaceRoot })
    });

    const data = await response.json();
    return {
      id: data.runId,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      results: new Map(Object.entries(data.results))
    };
  },

  async coverage(workspaceRoot: string): Promise<TestCoverage[]> {
    const response = await fetch('/api/test/coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'jest', workspaceRoot })
    });

    const data = await response.json();
    return data.coverage || [];
  }
};

export const PytestAdapter: TestAdapter = {
  id: 'pytest',
  label: 'Pytest',
  filePattern: /test_.*\.py$|.*_test\.py$/,
  
  async discover(workspaceRoot: string): Promise<TestItem[]> {
    const response = await fetch('/api/test/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'pytest', workspaceRoot })
    });

    const data = await response.json();
    return data.tests || [];
  },

  async run(testIds: string[], workspaceRoot: string): Promise<TestRun> {
    const response = await fetch('/api/test/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'pytest', testIds, workspaceRoot })
    });

    const data = await response.json();
    return {
      id: data.runId,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      results: new Map(Object.entries(data.results))
    };
  },

  async coverage(workspaceRoot: string): Promise<TestCoverage[]> {
    const response = await fetch('/api/test/coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'pytest', workspaceRoot })
    });

    const data = await response.json();
    return data.coverage || [];
  }
};

export const GoTestAdapter: TestAdapter = {
  id: 'gotest',
  label: 'Go Test',
  filePattern: /_test\.go$/,
  
  async discover(workspaceRoot: string): Promise<TestItem[]> {
    const response = await fetch('/api/test/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'gotest', workspaceRoot })
    });

    const data = await response.json();
    return data.tests || [];
  },

  async run(testIds: string[], workspaceRoot: string): Promise<TestRun> {
    const response = await fetch('/api/test/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'gotest', testIds, workspaceRoot })
    });

    const data = await response.json();
    return {
      id: data.runId,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      results: new Map(Object.entries(data.results))
    };
  },

  async coverage(workspaceRoot: string): Promise<TestCoverage[]> {
    const response = await fetch('/api/test/coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adapter: 'gotest', workspaceRoot })
    });

    const data = await response.json();
    return data.coverage || [];
  }
};

// Singleton instance
let testManagerInstance: TestManager | null = null;

export function getTestManager(): TestManager {
  if (!testManagerInstance) {
    testManagerInstance = new TestManager();
    
    // Register built-in adapters
    testManagerInstance.registerAdapter(JestAdapter);
    testManagerInstance.registerAdapter(PytestAdapter);
    testManagerInstance.registerAdapter(GoTestAdapter);
  }
  return testManagerInstance;
}

export function resetTestManager(): void {
  testManagerInstance = null;
}
