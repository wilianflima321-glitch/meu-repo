// ============================================================================
// AETHEL ENGINE - TEST RUNNER SYSTEM
// Sistema completo de execução e gestão de testes para a IDE
// ============================================================================

import { injectable, inject, Container, ContainerModule, interfaces } from 'inversify';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'timeout';
export type TestType = 'unit' | 'integration' | 'e2e' | 'performance' | 'visual' | 'accessibility';
export type AssertionType = 'equal' | 'notEqual' | 'truthy' | 'falsy' | 'throws' | 'resolves' | 'rejects' | 'matches' | 'contains' | 'type';

export interface TestConfig {
  timeout?: number;
  retries?: number;
  concurrent?: boolean;
  tags?: string[];
  skip?: boolean;
  only?: boolean;
}

export interface TestResult {
  id: string;
  name: string;
  suiteName: string;
  status: TestStatus;
  duration: number;
  startTime: number;
  endTime: number;
  error?: TestError;
  assertions: AssertionResult[];
  logs: TestLog[];
  retryCount: number;
  metadata: Record<string, unknown>;
}

export interface TestError {
  message: string;
  stack?: string;
  expected?: unknown;
  actual?: unknown;
  diff?: string;
}

export interface AssertionResult {
  type: AssertionType;
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
  location?: { file: string; line: number; column: number };
}

export interface TestLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  data?: unknown;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void> | void;
  afterAll?: () => Promise<void> | void;
  beforeEach?: () => Promise<void> | void;
  afterEach?: () => Promise<void> | void;
  config: TestConfig;
  nested: TestSuite[];
}

export interface TestCase {
  id: string;
  name: string;
  fn: () => Promise<void> | void;
  config: TestConfig;
  type: TestType;
}

export interface TestRunSummary {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timeout: number;
  results: TestResult[];
  coverage?: CoverageReport;
}

export interface CoverageReport {
  lines: CoverageStats;
  branches: CoverageStats;
  functions: CoverageStats;
  statements: CoverageStats;
  files: FileCoverage[];
}

export interface CoverageStats {
  total: number;
  covered: number;
  percentage: number;
}

export interface FileCoverage {
  path: string;
  lines: CoverageStats;
  branches: CoverageStats;
  functions: CoverageStats;
  uncoveredLines: number[];
}

export interface TestFilter {
  pattern?: string | RegExp;
  tags?: string[];
  types?: TestType[];
  suites?: string[];
  status?: TestStatus[];
}

export interface WatchOptions {
  paths: string[];
  patterns: string[];
  debounce: number;
}

// ============================================================================
// ASSERTION LIBRARY - Biblioteca de assertions poderosa
// ============================================================================

export interface ExpectChain<T> {
  toBe(expected: T): void;
  toEqual(expected: T): void;
  toStrictEqual(expected: T): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNaN(): void;
  toBeInstanceOf(constructor: new (...args: unknown[]) => unknown): void;
  toMatch(pattern: RegExp | string): void;
  toContain(item: unknown): void;
  toHaveLength(length: number): void;
  toHaveProperty(path: string, value?: unknown): void;
  toBeGreaterThan(num: number): void;
  toBeGreaterThanOrEqual(num: number): void;
  toBeLessThan(num: number): void;
  toBeLessThanOrEqual(num: number): void;
  toBeCloseTo(num: number, precision?: number): void;
  toThrow(expected?: string | RegExp | Error): void;
  toThrowError(expected?: string | RegExp | Error): void;
  resolves: ExpectChain<Awaited<T>>;
  rejects: ExpectChain<unknown>;
  not: ExpectChain<T>;
}

@injectable()
export class Expect {
  private assertions: AssertionResult[] = [];
  private negated = false;

  getAssertions(): AssertionResult[] {
    return [...this.assertions];
  }

  clearAssertions(): void {
    this.assertions = [];
  }

  expect<T>(actual: T): ExpectChain<T> {
    const self = this;
    let isNegated = false;

    const addAssertion = (
      type: AssertionType,
      passed: boolean,
      message: string,
      expected?: unknown,
      actualValue?: unknown
    ): void => {
      const finalPassed = isNegated ? !passed : passed;
      const result: AssertionResult = {
        type,
        passed: finalPassed,
        message: isNegated ? `NOT: ${message}` : message,
        expected,
        actual: actualValue,
      };
      self.assertions.push(result);
      
      if (!finalPassed) {
        const error = new Error(result.message);
        (error as any).expected = expected;
        (error as any).actual = actualValue;
        throw error;
      }
    };

    const chain: ExpectChain<T> = {
      toBe(expected: T): void {
        addAssertion('equal', actual === expected, 
          `Expected ${actual} to be ${expected}`, expected, actual);
      },

      toEqual(expected: T): void {
        const deepEqual = JSON.stringify(actual) === JSON.stringify(expected);
        addAssertion('equal', deepEqual,
          `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`, expected, actual);
      },

      toStrictEqual(expected: T): void {
        const strictEqual = Object.is(actual, expected);
        addAssertion('equal', strictEqual,
          `Expected ${actual} to strictly equal ${expected}`, expected, actual);
      },

      toBeTruthy(): void {
        addAssertion('truthy', !!actual, `Expected ${actual} to be truthy`, true, actual);
      },

      toBeFalsy(): void {
        addAssertion('falsy', !actual, `Expected ${actual} to be falsy`, false, actual);
      },

      toBeNull(): void {
        addAssertion('equal', actual === null, `Expected ${actual} to be null`, null, actual);
      },

      toBeUndefined(): void {
        addAssertion('equal', actual === undefined, `Expected ${actual} to be undefined`, undefined, actual);
      },

      toBeDefined(): void {
        addAssertion('equal', actual !== undefined, `Expected ${actual} to be defined`, 'defined', actual);
      },

      toBeNaN(): void {
        addAssertion('equal', Number.isNaN(actual as number), `Expected ${actual} to be NaN`, NaN, actual);
      },

      toBeInstanceOf(constructor: new (...args: unknown[]) => unknown): void {
        const isInstance = actual instanceof constructor;
        addAssertion('type', isInstance,
          `Expected ${actual} to be instance of ${constructor.name}`, constructor.name, typeof actual);
      },

      toMatch(pattern: RegExp | string): void {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        const matches = regex.test(String(actual));
        addAssertion('matches', matches,
          `Expected ${actual} to match ${pattern}`, pattern.toString(), actual);
      },

      toContain(item: unknown): void {
        let contains = false;
        if (Array.isArray(actual)) {
          contains = actual.includes(item);
        } else if (typeof actual === 'string') {
          contains = actual.includes(String(item));
        }
        addAssertion('contains', contains,
          `Expected ${actual} to contain ${item}`, item, actual);
      },

      toHaveLength(length: number): void {
        const actualLength = (actual as unknown as { length: number })?.length;
        addAssertion('equal', actualLength === length,
          `Expected length ${actualLength} to be ${length}`, length, actualLength);
      },

      toHaveProperty(path: string, value?: unknown): void {
        const parts = path.split('.');
        let current: unknown = actual;
        let hasProperty = true;
        
        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = (current as Record<string, unknown>)[part];
          } else {
            hasProperty = false;
            break;
          }
        }
        
        if (value !== undefined && hasProperty) {
          hasProperty = current === value;
        }
        
        addAssertion('equal', hasProperty,
          `Expected ${actual} to have property ${path}${value !== undefined ? ` = ${value}` : ''}`, 
          value ?? 'exists', current);
      },

      toBeGreaterThan(num: number): void {
        addAssertion('equal', (actual as number) > num,
          `Expected ${actual} to be greater than ${num}`, `> ${num}`, actual);
      },

      toBeGreaterThanOrEqual(num: number): void {
        addAssertion('equal', (actual as number) >= num,
          `Expected ${actual} to be greater than or equal to ${num}`, `>= ${num}`, actual);
      },

      toBeLessThan(num: number): void {
        addAssertion('equal', (actual as number) < num,
          `Expected ${actual} to be less than ${num}`, `< ${num}`, actual);
      },

      toBeLessThanOrEqual(num: number): void {
        addAssertion('equal', (actual as number) <= num,
          `Expected ${actual} to be less than or equal to ${num}`, `<= ${num}`, actual);
      },

      toBeCloseTo(num: number, precision = 2): void {
        const diff = Math.abs((actual as number) - num);
        const close = diff < Math.pow(10, -precision) / 2;
        addAssertion('equal', close,
          `Expected ${actual} to be close to ${num} (precision: ${precision})`, num, actual);
      },

      toThrow(expected?: string | RegExp | Error): void {
        let threw = false;
        let thrownError: unknown;
        
        try {
          (actual as () => void)();
        } catch (e) {
          threw = true;
          thrownError = e;
        }
        
        let matches = threw;
        if (expected && threw) {
          if (typeof expected === 'string') {
            matches = (thrownError as Error).message.includes(expected);
          } else if (expected instanceof RegExp) {
            matches = expected.test((thrownError as Error).message);
          } else if (expected instanceof Error) {
            matches = (thrownError as Error).message === expected.message;
          }
        }
        
        addAssertion('throws', matches,
          `Expected function to throw${expected ? ` ${expected}` : ''}`,
          expected ?? 'any error', thrownError);
      },

      toThrowError(expected?: string | RegExp | Error): void {
        this.toThrow(expected);
      },

      get resolves(): ExpectChain<Awaited<T>> {
        // Wrapper for async assertions
        return this as unknown as ExpectChain<Awaited<T>>;
      },

      get rejects(): ExpectChain<unknown> {
        return this as unknown as ExpectChain<unknown>;
      },

      get not(): ExpectChain<T> {
        isNegated = !isNegated;
        return chain;
      }
    };

    return chain;
  }
}

// ============================================================================
// TEST CONTEXT - Contexto de execução de testes
// ============================================================================

export interface ITestContext {
  name: string;
  suite: string;
  timeout: number;
  retries: number;
  expect: Expect;
  logs: TestLog[];
  skip(reason?: string): void;
  log(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
}

@injectable()
export class TestContext implements ITestContext {
  name = '';
  suite = '';
  timeout = 5000;
  retries = 0;
  expect = new Expect();
  logs: TestLog[] = [];
  private skipped = false;
  private skipReason?: string;

  isSkipped(): boolean {
    return this.skipped;
  }

  getSkipReason(): string | undefined {
    return this.skipReason;
  }

  skip(reason?: string): void {
    this.skipped = true;
    this.skipReason = reason;
    throw new SkipTestError(reason);
  }

  log(message: string, data?: unknown): void {
    this.logs.push({ level: 'info', message, timestamp: Date.now(), data });
  }

  warn(message: string, data?: unknown): void {
    this.logs.push({ level: 'warn', message, timestamp: Date.now(), data });
  }

  error(message: string, data?: unknown): void {
    this.logs.push({ level: 'error', message, timestamp: Date.now(), data });
  }

  debug(message: string, data?: unknown): void {
    this.logs.push({ level: 'debug', message, timestamp: Date.now(), data });
  }

  reset(): void {
    this.logs = [];
    this.skipped = false;
    this.skipReason = undefined;
    this.expect.clearAssertions();
  }
}

export class SkipTestError extends Error {
  constructor(public reason?: string) {
    super(`Test skipped${reason ? `: ${reason}` : ''}`);
    this.name = 'SkipTestError';
  }
}

export class TimeoutTestError extends Error {
  constructor(public testName: string, public timeoutMs: number) {
    super(`Test "${testName}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutTestError';
  }
}

// ============================================================================
// TEST SUITE BUILDER - Builder fluent para criar suites de teste
// ============================================================================

export interface ITestSuiteBuilder {
  describe(name: string, fn: () => void): ITestSuiteBuilder;
  it(name: string, fn: (ctx: ITestContext) => Promise<void> | void, config?: TestConfig): ITestSuiteBuilder;
  test(name: string, fn: (ctx: ITestContext) => Promise<void> | void, config?: TestConfig): ITestSuiteBuilder;
  beforeAll(fn: () => Promise<void> | void): ITestSuiteBuilder;
  afterAll(fn: () => Promise<void> | void): ITestSuiteBuilder;
  beforeEach(fn: () => Promise<void> | void): ITestSuiteBuilder;
  afterEach(fn: () => Promise<void> | void): ITestSuiteBuilder;
  skip: ITestSuiteBuilder;
  only: ITestSuiteBuilder;
  timeout(ms: number): ITestSuiteBuilder;
  retries(count: number): ITestSuiteBuilder;
  tags(...tags: string[]): ITestSuiteBuilder;
  build(): TestSuite;
}

@injectable()
export class TestSuiteBuilder implements ITestSuiteBuilder {
  private suite: TestSuite;
  private currentSuite: TestSuite;
  private suiteStack: TestSuite[] = [];
  private nextConfig: Partial<TestConfig> = {};

  constructor() {
    this.suite = this.createEmptySuite('root');
    this.currentSuite = this.suite;
  }

  private createEmptySuite(name: string): TestSuite {
    return {
      id: `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      tests: [],
      config: {},
      nested: [],
    };
  }

  describe(name: string, fn: () => void): ITestSuiteBuilder {
    const newSuite = this.createEmptySuite(name);
    newSuite.config = { ...this.nextConfig };
    this.nextConfig = {};
    
    this.currentSuite.nested.push(newSuite);
    this.suiteStack.push(this.currentSuite);
    this.currentSuite = newSuite;
    
    fn();
    
    this.currentSuite = this.suiteStack.pop()!;
    return this;
  }

  it(name: string, fn: (ctx: ITestContext) => Promise<void> | void, config?: TestConfig): ITestSuiteBuilder {
    return this.test(name, fn, config);
  }

  test(name: string, fn: (ctx: ITestContext) => Promise<void> | void, config?: TestConfig): ITestSuiteBuilder {
    const testCase: TestCase = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      fn: fn as () => Promise<void> | void,
      config: { ...this.nextConfig, ...config },
      type: 'unit',
    };
    this.nextConfig = {};
    this.currentSuite.tests.push(testCase);
    return this;
  }

  beforeAll(fn: () => Promise<void> | void): ITestSuiteBuilder {
    this.currentSuite.beforeAll = fn;
    return this;
  }

  afterAll(fn: () => Promise<void> | void): ITestSuiteBuilder {
    this.currentSuite.afterAll = fn;
    return this;
  }

  beforeEach(fn: () => Promise<void> | void): ITestSuiteBuilder {
    this.currentSuite.beforeEach = fn;
    return this;
  }

  afterEach(fn: () => Promise<void> | void): ITestSuiteBuilder {
    this.currentSuite.afterEach = fn;
    return this;
  }

  get skip(): ITestSuiteBuilder {
    this.nextConfig.skip = true;
    return this;
  }

  get only(): ITestSuiteBuilder {
    this.nextConfig.only = true;
    return this;
  }

  timeout(ms: number): ITestSuiteBuilder {
    this.nextConfig.timeout = ms;
    return this;
  }

  retries(count: number): ITestSuiteBuilder {
    this.nextConfig.retries = count;
    return this;
  }

  tags(...tags: string[]): ITestSuiteBuilder {
    this.nextConfig.tags = tags;
    return this;
  }

  build(): TestSuite {
    return this.suite;
  }
}

// ============================================================================
// TEST RUNNER - Motor de execução de testes
// ============================================================================

export interface ITestRunner {
  run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary>;
  runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary>;
  stop(): void;
  on(event: TestRunnerEvent, handler: TestRunnerEventHandler): void;
  off(event: TestRunnerEvent, handler: TestRunnerEventHandler): void;
}

export type TestRunnerEvent = 'start' | 'end' | 'suiteStart' | 'suiteEnd' | 'testStart' | 'testEnd' | 'error';
export type TestRunnerEventHandler = (data: unknown) => void;

@injectable()
export class TestRunner implements ITestRunner {
  private running = false;
  private shouldStop = false;
  private eventHandlers: Map<TestRunnerEvent, Set<TestRunnerEventHandler>> = new Map();
  private context = new TestContext();
  private defaultTimeout = 5000;
  private defaultRetries = 0;

  async run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary> {
    return this.runAll([suite], filter);
  }

  async runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary> {
    if (this.running) {
      throw new Error('Test runner is already running');
    }

    this.running = true;
    this.shouldStop = false;

    const startTime = Date.now();
    const results: TestResult[] = [];

    this.emit('start', { suites, filter, startTime });

    try {
      for (const suite of suites) {
        if (this.shouldStop) break;
        await this.runSuite(suite, results, filter, []);
      }
    } finally {
      this.running = false;
    }

    const endTime = Date.now();
    const summary: TestRunSummary = {
      id: `run-${startTime}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      results,
    };

    this.emit('end', summary);
    return summary;
  }

  private async runSuite(
    suite: TestSuite,
    results: TestResult[],
    filter: TestFilter | undefined,
    parentNames: string[]
  ): Promise<void> {
    if (suite.config.skip) return;

    const suitePath = [...parentNames, suite.name];
    this.emit('suiteStart', { suite, path: suitePath });

    try {
      // beforeAll
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      // Run tests
      for (const test of suite.tests) {
        if (this.shouldStop) break;
        if (this.shouldSkipTest(test, filter)) {
          results.push(this.createSkippedResult(test, suitePath.join(' > ')));
          continue;
        }
        const result = await this.runTest(test, suite, suitePath.join(' > '));
        results.push(result);
      }

      // Run nested suites
      for (const nested of suite.nested) {
        if (this.shouldStop) break;
        await this.runSuite(nested, results, filter, suitePath);
      }

      // afterAll
      if (suite.afterAll) {
        await suite.afterAll();
      }
    } catch (error) {
      this.emit('error', { suite, error });
    }

    this.emit('suiteEnd', { suite, path: suitePath });
  }

  private async runTest(test: TestCase, suite: TestSuite, suitePath: string): Promise<TestResult> {
    const startTime = Date.now();
    const timeout = test.config.timeout ?? suite.config.timeout ?? this.defaultTimeout;
    const maxRetries = test.config.retries ?? suite.config.retries ?? this.defaultRetries;

    let retryCount = 0;
    let lastError: TestError | undefined;

    this.emit('testStart', { test, suitePath, startTime });

    while (retryCount <= maxRetries) {
      this.context.reset();
      this.context.name = test.name;
      this.context.suite = suitePath;
      this.context.timeout = timeout;
      this.context.retries = maxRetries;

      try {
        // beforeEach
        if (suite.beforeEach) {
          await suite.beforeEach();
        }

        // Run test with timeout
        await this.runWithTimeout(async () => {
          await (test.fn as (ctx: ITestContext) => Promise<void>)(this.context);
        }, timeout, test.name);

        // afterEach
        if (suite.afterEach) {
          await suite.afterEach();
        }

        // Test passed
        const endTime = Date.now();
        const result: TestResult = {
          id: test.id,
          name: test.name,
          suiteName: suitePath,
          status: 'passed',
          duration: endTime - startTime,
          startTime,
          endTime,
          assertions: this.context.expect.getAssertions(),
          logs: [...this.context.logs],
          retryCount,
          metadata: {},
        };

        this.emit('testEnd', { result });
        return result;

      } catch (error) {
        if (error instanceof SkipTestError) {
          const endTime = Date.now();
          const result: TestResult = {
            id: test.id,
            name: test.name,
            suiteName: suitePath,
            status: 'skipped',
            duration: endTime - startTime,
            startTime,
            endTime,
            assertions: this.context.expect.getAssertions(),
            logs: [...this.context.logs],
            retryCount,
            metadata: { skipReason: error.reason },
          };
          this.emit('testEnd', { result });
          return result;
        }

        if (error instanceof TimeoutTestError) {
          lastError = {
            message: error.message,
            stack: error.stack,
          };
          
          const endTime = Date.now();
          const result: TestResult = {
            id: test.id,
            name: test.name,
            suiteName: suitePath,
            status: 'timeout',
            duration: endTime - startTime,
            startTime,
            endTime,
            error: lastError,
            assertions: this.context.expect.getAssertions(),
            logs: [...this.context.logs],
            retryCount,
            metadata: {},
          };
          this.emit('testEnd', { result });
          return result;
        }

        lastError = {
          message: (error as Error).message,
          stack: (error as Error).stack,
          expected: (error as any).expected,
          actual: (error as any).actual,
        };

        retryCount++;
      }
    }

    // All retries failed
    const endTime = Date.now();
    const result: TestResult = {
      id: test.id,
      name: test.name,
      suiteName: suitePath,
      status: 'failed',
      duration: endTime - startTime,
      startTime,
      endTime,
      error: lastError,
      assertions: this.context.expect.getAssertions(),
      logs: [...this.context.logs],
      retryCount: retryCount - 1,
      metadata: {},
    };

    this.emit('testEnd', { result });
    return result;
  }

  private async runWithTimeout<T>(fn: () => Promise<T>, timeout: number, testName: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutTestError(testName, timeout));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private shouldSkipTest(test: TestCase, filter?: TestFilter): boolean {
    if (test.config.skip) return true;
    if (!filter) return false;

    if (filter.pattern) {
      const pattern = typeof filter.pattern === 'string' ? new RegExp(filter.pattern) : filter.pattern;
      if (!pattern.test(test.name)) return true;
    }

    if (filter.tags && filter.tags.length > 0) {
      if (!test.config.tags || !filter.tags.some(t => test.config.tags!.includes(t))) {
        return true;
      }
    }

    if (filter.types && filter.types.length > 0) {
      if (!filter.types.includes(test.type)) return true;
    }

    return false;
  }

  private createSkippedResult(test: TestCase, suitePath: string): TestResult {
    const now = Date.now();
    return {
      id: test.id,
      name: test.name,
      suiteName: suitePath,
      status: 'skipped',
      duration: 0,
      startTime: now,
      endTime: now,
      assertions: [],
      logs: [],
      retryCount: 0,
      metadata: {},
    };
  }

  stop(): void {
    this.shouldStop = true;
  }

  on(event: TestRunnerEvent, handler: TestRunnerEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: TestRunnerEvent, handler: TestRunnerEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: TestRunnerEvent, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error(`Error in test runner event handler for ${event}:`, e);
      }
    });
  }
}

// ============================================================================
// TEST REPORTER - Sistema de relatórios de teste
// ============================================================================

export interface ITestReporter {
  report(summary: TestRunSummary): string;
  reportToConsole(summary: TestRunSummary): void;
  reportToJson(summary: TestRunSummary): string;
  reportToHtml(summary: TestRunSummary): string;
}

@injectable()
export class TestReporter implements ITestReporter {
  report(summary: TestRunSummary): string {
    const lines: string[] = [];
    
    lines.push('═'.repeat(60));
    lines.push('  TEST RESULTS');
    lines.push('═'.repeat(60));
    lines.push('');
    
    // Summary
    lines.push(`  Total:   ${summary.total}`);
    lines.push(`  Passed:  ${summary.passed} ✓`);
    lines.push(`  Failed:  ${summary.failed} ✗`);
    lines.push(`  Skipped: ${summary.skipped} ○`);
    lines.push(`  Timeout: ${summary.timeout} ⧖`);
    lines.push('');
    lines.push(`  Duration: ${summary.duration}ms`);
    lines.push('');
    
    // Failed tests details
    const failed = summary.results.filter(r => r.status === 'failed' || r.status === 'timeout');
    if (failed.length > 0) {
      lines.push('─'.repeat(60));
      lines.push('  FAILURES');
      lines.push('─'.repeat(60));
      
      for (const result of failed) {
        lines.push('');
        lines.push(`  ✗ ${result.suiteName} > ${result.name}`);
        if (result.error) {
          lines.push(`    ${result.error.message}`);
          if (result.error.expected !== undefined) {
            lines.push(`    Expected: ${JSON.stringify(result.error.expected)}`);
            lines.push(`    Received: ${JSON.stringify(result.error.actual)}`);
          }
        }
      }
    }
    
    lines.push('');
    lines.push('═'.repeat(60));
    
    const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0.0';
    lines.push(`  Pass Rate: ${passRate}%`);
    lines.push('═'.repeat(60));
    
    return lines.join('\n');
  }

  reportToConsole(summary: TestRunSummary): void {
    console.log(this.report(summary));
  }

  reportToJson(summary: TestRunSummary): string {
    return JSON.stringify(summary, null, 2);
  }

  reportToHtml(summary: TestRunSummary): string {
    const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0.0';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Aethel Engine</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: #eee; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #00d9ff; border-bottom: 2px solid #00d9ff; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat { background: #16213e; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; }
        .stat-label { color: #888; margin-top: 5px; }
        .passed { color: #00ff88; }
        .failed { color: #ff4757; }
        .skipped { color: #ffa502; }
        .timeout { color: #ff6b81; }
        .results { margin-top: 30px; }
        .test-result { background: #16213e; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid; }
        .test-result.passed { border-color: #00ff88; }
        .test-result.failed { border-color: #ff4757; }
        .test-result.skipped { border-color: #ffa502; }
        .test-result.timeout { border-color: #ff6b81; }
        .test-name { font-weight: bold; }
        .test-suite { color: #888; font-size: 0.9em; }
        .error-message { background: #2d142c; padding: 10px; margin-top: 10px; border-radius: 4px; font-family: monospace; }
        .progress-bar { height: 20px; background: #16213e; border-radius: 10px; overflow: hidden; margin: 20px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #00ff88, #00d9ff); transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Aethel Engine - Test Report</h1>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
        
        <div class="summary">
            <div class="stat">
                <div class="stat-value">${summary.total}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat">
                <div class="stat-value passed">${summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat">
                <div class="stat-value failed">${summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat">
                <div class="stat-value skipped">${summary.skipped}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat">
                <div class="stat-value timeout">${summary.timeout}</div>
                <div class="stat-label">Timeout</div>
            </div>
            <div class="stat">
                <div class="stat-value">${summary.duration}ms</div>
                <div class="stat-label">Duration</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results</h2>
            ${summary.results.map(r => `
                <div class="test-result ${r.status}">
                    <div class="test-name">${this.escapeHtml(r.name)}</div>
                    <div class="test-suite">${this.escapeHtml(r.suiteName)}</div>
                    ${r.error ? `<div class="error-message">${this.escapeHtml(r.error.message)}</div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ============================================================================
// MOCK UTILITIES - Sistema de mocks para testes
// ============================================================================

export interface MockFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Parameters<T>[];
  callCount: number;
  mockReturnValue(value: ReturnType<T>): MockFunction<T>;
  mockReturnValueOnce(value: ReturnType<T>): MockFunction<T>;
  mockImplementation(fn: T): MockFunction<T>;
  mockImplementationOnce(fn: T): MockFunction<T>;
  mockResolvedValue(value: Awaited<ReturnType<T>>): MockFunction<T>;
  mockRejectedValue(error: unknown): MockFunction<T>;
  mockReset(): void;
  mockClear(): void;
}

export function createMock<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): MockFunction<T> {
  let currentImpl: T | undefined = implementation;
  const onceImpls: T[] = [];
  let returnValue: ReturnType<T> | undefined;
  const onceReturnValues: ReturnType<T>[] = [];

  const mock = function(...args: Parameters<T>): ReturnType<T> {
    mock.calls.push(args);
    mock.callCount++;

    if (onceImpls.length > 0) {
      const impl = onceImpls.shift()!;
      return impl(...args) as ReturnType<T>;
    }

    if (onceReturnValues.length > 0) {
      return onceReturnValues.shift()!;
    }

    if (returnValue !== undefined) {
      return returnValue;
    }

    if (currentImpl) {
      return currentImpl(...args) as ReturnType<T>;
    }

    return undefined as ReturnType<T>;
  } as MockFunction<T>;

  mock.calls = [];
  mock.callCount = 0;

  mock.mockReturnValue = (value: ReturnType<T>) => {
    returnValue = value;
    return mock;
  };

  mock.mockReturnValueOnce = (value: ReturnType<T>) => {
    onceReturnValues.push(value);
    return mock;
  };

  mock.mockImplementation = (fn: T) => {
    currentImpl = fn;
    return mock;
  };

  mock.mockImplementationOnce = (fn: T) => {
    onceImpls.push(fn);
    return mock;
  };

  mock.mockResolvedValue = (value: Awaited<ReturnType<T>>) => {
    returnValue = Promise.resolve(value) as ReturnType<T>;
    return mock;
  };

  mock.mockRejectedValue = (error: unknown) => {
    returnValue = Promise.reject(error) as ReturnType<T>;
    return mock;
  };

  mock.mockReset = () => {
    mock.calls = [];
    mock.callCount = 0;
    currentImpl = implementation;
    returnValue = undefined;
    onceImpls.length = 0;
    onceReturnValues.length = 0;
  };

  mock.mockClear = () => {
    mock.calls = [];
    mock.callCount = 0;
  };

  return mock;
}

export function spyOn<T extends object, K extends keyof T>(
  object: T,
  method: K
): MockFunction<T[K] extends (...args: unknown[]) => unknown ? T[K] : never> {
  const original = object[method];
  const mock = createMock(original as unknown as (...args: unknown[]) => unknown);
  (object as any)[method] = mock;
  return mock as any;
}

// ============================================================================
// TEST WATCH MODE - Modo watch para desenvolvimento
// ============================================================================

export interface ITestWatcher {
  start(options: WatchOptions, suites: TestSuite[]): void;
  stop(): void;
  isWatching(): boolean;
  on(event: 'change' | 'run', handler: (data: unknown) => void): void;
}

@injectable()
export class TestWatcher implements ITestWatcher {
  private watching = false;
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private watchers: (() => void)[] = [];
  private debounceTimer?: NodeJS.Timeout;

  start(options: WatchOptions, suites: TestSuite[]): void {
    if (this.watching) return;
    this.watching = true;

    // Em ambiente de navegador/IDE, usaríamos FileSystemWatcher
    // Aqui fornecemos a estrutura para integração
    console.log('[TestWatcher] Started watching for changes');
    this.emit('change', { type: 'start', paths: options.paths });
  }

  stop(): void {
    if (!this.watching) return;
    this.watching = false;
    
    this.watchers.forEach(unwatch => unwatch());
    this.watchers = [];
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    console.log('[TestWatcher] Stopped watching');
  }

  isWatching(): boolean {
    return this.watching;
  }

  on(event: 'change' | 'run', handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  private emit(event: string, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data));
  }
}

// ============================================================================
// TEST COVERAGE - Sistema de cobertura de código
// ============================================================================

export interface ITestCoverage {
  start(): void;
  stop(): CoverageReport;
  isCollecting(): boolean;
  getCoverageFor(file: string): FileCoverage | undefined;
}

@injectable()
export class TestCoverage implements ITestCoverage {
  private collecting = false;
  private fileCoverages: Map<string, FileCoverage> = new Map();

  start(): void {
    if (this.collecting) return;
    this.collecting = true;
    this.fileCoverages.clear();
    // Integração com istanbul/nyc seria feita aqui
  }

  stop(): CoverageReport {
    this.collecting = false;
    
    const files = Array.from(this.fileCoverages.values());
    
    const aggregate = (stat: keyof FileCoverage): CoverageStats => {
      if (stat === 'path' || stat === 'uncoveredLines') {
        return { total: 0, covered: 0, percentage: 0 };
      }
      const total = files.reduce((sum, f) => sum + (f[stat] as CoverageStats).total, 0);
      const covered = files.reduce((sum, f) => sum + (f[stat] as CoverageStats).covered, 0);
      return {
        total,
        covered,
        percentage: total > 0 ? (covered / total) * 100 : 0,
      };
    };

    return {
      lines: aggregate('lines'),
      branches: aggregate('branches'),
      functions: aggregate('functions'),
      statements: aggregate('lines'), // Approximation
      files,
    };
  }

  isCollecting(): boolean {
    return this.collecting;
  }

  getCoverageFor(file: string): FileCoverage | undefined {
    return this.fileCoverages.get(file);
  }
}

// ============================================================================
// TEST SYSTEM FACADE - Fachada unificada para todo o sistema de testes
// ============================================================================

export interface ITestSystem {
  createSuite(): ITestSuiteBuilder;
  run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary>;
  runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary>;
  stop(): void;
  watch(options: WatchOptions, suites: TestSuite[]): void;
  stopWatch(): void;
  getReport(summary: TestRunSummary, format?: 'text' | 'json' | 'html'): string;
  mock<T extends (...args: unknown[]) => unknown>(fn?: T): MockFunction<T>;
  spyOn<T extends object, K extends keyof T>(object: T, method: K): MockFunction<any>;
  expect: Expect;
}

@injectable()
export class TestSystem implements ITestSystem {
  expect = new Expect();

  constructor(
    @inject('TestRunner') private runner: TestRunner,
    @inject('TestReporter') private reporter: TestReporter,
    @inject('TestWatcher') private watcher: TestWatcher,
    @inject('TestCoverage') private coverage: TestCoverage
  ) {}

  createSuite(): ITestSuiteBuilder {
    return new TestSuiteBuilder();
  }

  async run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary> {
    return this.runner.run(suite, filter);
  }

  async runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary> {
    return this.runner.runAll(suites, filter);
  }

  stop(): void {
    this.runner.stop();
  }

  watch(options: WatchOptions, suites: TestSuite[]): void {
    this.watcher.start(options, suites);
  }

  stopWatch(): void {
    this.watcher.stop();
  }

  getReport(summary: TestRunSummary, format: 'text' | 'json' | 'html' = 'text'): string {
    switch (format) {
      case 'json':
        return this.reporter.reportToJson(summary);
      case 'html':
        return this.reporter.reportToHtml(summary);
      default:
        return this.reporter.report(summary);
    }
  }

  mock<T extends (...args: unknown[]) => unknown>(fn?: T): MockFunction<T> {
    return createMock(fn);
  }

  spyOn<T extends object, K extends keyof T>(object: T, method: K): MockFunction<any> {
    return spyOn(object, method);
  }
}

// ============================================================================
// DEPENDENCY INJECTION - Container Module
// ============================================================================

export const TEST_TYPES = {
  TestRunner: Symbol.for('TestRunner'),
  TestReporter: Symbol.for('TestReporter'),
  TestWatcher: Symbol.for('TestWatcher'),
  TestCoverage: Symbol.for('TestCoverage'),
  TestSystem: Symbol.for('TestSystem'),
  TestContext: Symbol.for('TestContext'),
  Expect: Symbol.for('Expect'),
};

export const TestingContainerModule = new ContainerModule((bind) => {
  bind(TEST_TYPES.TestRunner).to(TestRunner).inSingletonScope();
  bind(TEST_TYPES.TestReporter).to(TestReporter).inSingletonScope();
  bind(TEST_TYPES.TestWatcher).to(TestWatcher).inSingletonScope();
  bind(TEST_TYPES.TestCoverage).to(TestCoverage).inSingletonScope();
  bind(TEST_TYPES.TestContext).to(TestContext).inTransientScope();
  bind(TEST_TYPES.Expect).to(Expect).inTransientScope();
  bind(TEST_TYPES.TestSystem).to(TestSystem).inSingletonScope();
  
  // Bind named dependencies for TestSystem constructor
  bind('TestRunner').to(TestRunner).inSingletonScope();
  bind('TestReporter').to(TestReporter).inSingletonScope();
  bind('TestWatcher').to(TestWatcher).inSingletonScope();
  bind('TestCoverage').to(TestCoverage).inSingletonScope();
});

// ============================================================================
// QUICK START - Função helper para iniciar rapidamente
// ============================================================================

export function createTestSystem(): TestSystem {
  const container = new Container();
  container.load(TestingContainerModule as interfaces.ContainerModule);
  return container.get<TestSystem>(TEST_TYPES.TestSystem);
}

// DSL helpers para testes mais limpos
export function describe(name: string, fn: () => void): TestSuite {
  const builder = new TestSuiteBuilder();
  builder.describe(name, fn);
  return builder.build();
}

// Global expect helper
export function expect<T>(actual: T): ExpectChain<T> {
  return new Expect().expect(actual);
}

// ============================================================================
// MODULE INFO
// ============================================================================

export const TestingModuleInfo = {
  name: 'test-runner-system',
  version: '1.0.0',
  description: 'Sistema completo de Testing/QA para Aethel IDE',
  features: [
    'Test Runner com suporte a timeout e retries',
    'Assertion library completa (expect)',
    'Mock functions e spyOn',
    'Watch mode para desenvolvimento',
    'Relatórios em texto, JSON e HTML',
    'Suporte a cobertura de código',
    'DI com InversifyJS',
    'API fluente para definição de testes'
  ],
  exports: [
    'TestRunner',
    'TestReporter',
    'TestWatcher',
    'TestCoverage',
    'TestSystem',
    'TestSuiteBuilder',
    'Expect',
    'createMock',
    'spyOn',
    'createTestSystem',
    'describe',
    'expect'
  ]
};
