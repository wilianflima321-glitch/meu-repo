import { ContainerModule } from 'inversify';
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
    location?: {
        file: string;
        line: number;
        column: number;
    };
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
export declare class Expect {
    private assertions;
    private negated;
    getAssertions(): AssertionResult[];
    clearAssertions(): void;
    expect<T>(actual: T): ExpectChain<T>;
}
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
export declare class TestContext implements ITestContext {
    name: string;
    suite: string;
    timeout: number;
    retries: number;
    expect: Expect;
    logs: TestLog[];
    private skipped;
    private skipReason?;
    isSkipped(): boolean;
    getSkipReason(): string | undefined;
    skip(reason?: string): void;
    log(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, data?: unknown): void;
    debug(message: string, data?: unknown): void;
    reset(): void;
}
export declare class SkipTestError extends Error {
    reason?: string | undefined;
    constructor(reason?: string | undefined);
}
export declare class TimeoutTestError extends Error {
    testName: string;
    timeoutMs: number;
    constructor(testName: string, timeoutMs: number);
}
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
export declare class TestSuiteBuilder implements ITestSuiteBuilder {
    private suite;
    private currentSuite;
    private suiteStack;
    private nextConfig;
    constructor();
    private createEmptySuite;
    describe(name: string, fn: () => void): ITestSuiteBuilder;
    it(name: string, fn: (ctx: ITestContext) => Promise<void> | void, config?: TestConfig): ITestSuiteBuilder;
    test(name: string, fn: (ctx: ITestContext) => Promise<void> | void, config?: TestConfig): ITestSuiteBuilder;
    beforeAll(fn: () => Promise<void> | void): ITestSuiteBuilder;
    afterAll(fn: () => Promise<void> | void): ITestSuiteBuilder;
    beforeEach(fn: () => Promise<void> | void): ITestSuiteBuilder;
    afterEach(fn: () => Promise<void> | void): ITestSuiteBuilder;
    get skip(): ITestSuiteBuilder;
    get only(): ITestSuiteBuilder;
    timeout(ms: number): ITestSuiteBuilder;
    retries(count: number): ITestSuiteBuilder;
    tags(...tags: string[]): ITestSuiteBuilder;
    build(): TestSuite;
}
export interface ITestRunner {
    run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary>;
    runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary>;
    stop(): void;
    on(event: TestRunnerEvent, handler: TestRunnerEventHandler): void;
    off(event: TestRunnerEvent, handler: TestRunnerEventHandler): void;
}
export type TestRunnerEvent = 'start' | 'end' | 'suiteStart' | 'suiteEnd' | 'testStart' | 'testEnd' | 'error';
export type TestRunnerEventHandler = (data: unknown) => void;
export declare class TestRunner implements ITestRunner {
    private running;
    private shouldStop;
    private eventHandlers;
    private context;
    private defaultTimeout;
    private defaultRetries;
    run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary>;
    runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary>;
    private runSuite;
    private runTest;
    private runWithTimeout;
    private shouldSkipTest;
    private createSkippedResult;
    stop(): void;
    on(event: TestRunnerEvent, handler: TestRunnerEventHandler): void;
    off(event: TestRunnerEvent, handler: TestRunnerEventHandler): void;
    private emit;
}
export interface ITestReporter {
    report(summary: TestRunSummary): string;
    reportToConsole(summary: TestRunSummary): void;
    reportToJson(summary: TestRunSummary): string;
    reportToHtml(summary: TestRunSummary): string;
}
export declare class TestReporter implements ITestReporter {
    report(summary: TestRunSummary): string;
    reportToConsole(summary: TestRunSummary): void;
    reportToJson(summary: TestRunSummary): string;
    reportToHtml(summary: TestRunSummary): string;
    private escapeHtml;
}
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
export declare function createMock<T extends (...args: unknown[]) => unknown>(implementation?: T): MockFunction<T>;
export declare function spyOn<T extends object, K extends keyof T>(object: T, method: K): MockFunction<T[K] extends (...args: unknown[]) => unknown ? T[K] : never>;
export interface ITestWatcher {
    start(options: WatchOptions, suites: TestSuite[]): void;
    stop(): void;
    isWatching(): boolean;
    on(event: 'change' | 'run', handler: (data: unknown) => void): void;
}
export declare class TestWatcher implements ITestWatcher {
    private watching;
    private eventHandlers;
    private watchers;
    private debounceTimer?;
    start(options: WatchOptions, suites: TestSuite[]): void;
    stop(): void;
    isWatching(): boolean;
    on(event: 'change' | 'run', handler: (data: unknown) => void): void;
    private emit;
}
export interface ITestCoverage {
    start(): void;
    stop(): CoverageReport;
    isCollecting(): boolean;
    getCoverageFor(file: string): FileCoverage | undefined;
}
export declare class TestCoverage implements ITestCoverage {
    private collecting;
    private fileCoverages;
    start(): void;
    stop(): CoverageReport;
    isCollecting(): boolean;
    getCoverageFor(file: string): FileCoverage | undefined;
}
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
export declare class TestSystem implements ITestSystem {
    private runner;
    private reporter;
    private watcher;
    private coverage;
    expect: Expect;
    constructor(runner: TestRunner, reporter: TestReporter, watcher: TestWatcher, coverage: TestCoverage);
    createSuite(): ITestSuiteBuilder;
    run(suite: TestSuite, filter?: TestFilter): Promise<TestRunSummary>;
    runAll(suites: TestSuite[], filter?: TestFilter): Promise<TestRunSummary>;
    stop(): void;
    watch(options: WatchOptions, suites: TestSuite[]): void;
    stopWatch(): void;
    getReport(summary: TestRunSummary, format?: 'text' | 'json' | 'html'): string;
    mock<T extends (...args: unknown[]) => unknown>(fn?: T): MockFunction<T>;
    spyOn<T extends object, K extends keyof T>(object: T, method: K): MockFunction<any>;
}
export declare const TEST_TYPES: {
    TestRunner: symbol;
    TestReporter: symbol;
    TestWatcher: symbol;
    TestCoverage: symbol;
    TestSystem: symbol;
    TestContext: symbol;
    Expect: symbol;
};
export declare const TestingContainerModule: ContainerModule;
export declare function createTestSystem(): TestSystem;
export declare function describe(name: string, fn: () => void): TestSuite;
export declare function expect<T>(actual: T): ExpectChain<T>;
export declare const TestingModuleInfo: {
    name: string;
    version: string;
    description: string;
    features: string[];
    exports: string[];
};
