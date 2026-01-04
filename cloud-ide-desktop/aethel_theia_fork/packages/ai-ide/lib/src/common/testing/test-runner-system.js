"use strict";
// ============================================================================
// AETHEL ENGINE - TEST RUNNER SYSTEM
// Sistema completo de execução e gestão de testes para a IDE
// ============================================================================
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingModuleInfo = exports.TestingContainerModule = exports.TEST_TYPES = exports.TestSystem = exports.TestCoverage = exports.TestWatcher = exports.TestReporter = exports.TestRunner = exports.TestSuiteBuilder = exports.TimeoutTestError = exports.SkipTestError = exports.TestContext = exports.Expect = void 0;
exports.createMock = createMock;
exports.spyOn = spyOn;
exports.createTestSystem = createTestSystem;
exports.describe = describe;
exports.expect = expect;
const inversify_1 = require("inversify");
let Expect = class Expect {
    constructor() {
        this.assertions = [];
        this.negated = false;
    }
    getAssertions() {
        return [...this.assertions];
    }
    clearAssertions() {
        this.assertions = [];
    }
    expect(actual) {
        const self = this;
        let isNegated = false;
        const addAssertion = (type, passed, message, expected, actualValue) => {
            const finalPassed = isNegated ? !passed : passed;
            const result = {
                type,
                passed: finalPassed,
                message: isNegated ? `NOT: ${message}` : message,
                expected,
                actual: actualValue,
            };
            self.assertions.push(result);
            if (!finalPassed) {
                const error = new Error(result.message);
                error.expected = expected;
                error.actual = actualValue;
                throw error;
            }
        };
        const chain = {
            toBe(expected) {
                addAssertion('equal', actual === expected, `Expected ${actual} to be ${expected}`, expected, actual);
            },
            toEqual(expected) {
                const deepEqual = JSON.stringify(actual) === JSON.stringify(expected);
                addAssertion('equal', deepEqual, `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`, expected, actual);
            },
            toStrictEqual(expected) {
                const strictEqual = Object.is(actual, expected);
                addAssertion('equal', strictEqual, `Expected ${actual} to strictly equal ${expected}`, expected, actual);
            },
            toBeTruthy() {
                addAssertion('truthy', !!actual, `Expected ${actual} to be truthy`, true, actual);
            },
            toBeFalsy() {
                addAssertion('falsy', !actual, `Expected ${actual} to be falsy`, false, actual);
            },
            toBeNull() {
                addAssertion('equal', actual === null, `Expected ${actual} to be null`, null, actual);
            },
            toBeUndefined() {
                addAssertion('equal', actual === undefined, `Expected ${actual} to be undefined`, undefined, actual);
            },
            toBeDefined() {
                addAssertion('equal', actual !== undefined, `Expected ${actual} to be defined`, 'defined', actual);
            },
            toBeNaN() {
                addAssertion('equal', Number.isNaN(actual), `Expected ${actual} to be NaN`, NaN, actual);
            },
            toBeInstanceOf(constructor) {
                const isInstance = actual instanceof constructor;
                addAssertion('type', isInstance, `Expected ${actual} to be instance of ${constructor.name}`, constructor.name, typeof actual);
            },
            toMatch(pattern) {
                const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
                const matches = regex.test(String(actual));
                addAssertion('matches', matches, `Expected ${actual} to match ${pattern}`, pattern.toString(), actual);
            },
            toContain(item) {
                let contains = false;
                if (Array.isArray(actual)) {
                    contains = actual.includes(item);
                }
                else if (typeof actual === 'string') {
                    contains = actual.includes(String(item));
                }
                addAssertion('contains', contains, `Expected ${actual} to contain ${item}`, item, actual);
            },
            toHaveLength(length) {
                const actualLength = actual?.length;
                addAssertion('equal', actualLength === length, `Expected length ${actualLength} to be ${length}`, length, actualLength);
            },
            toHaveProperty(path, value) {
                const parts = path.split('.');
                let current = actual;
                let hasProperty = true;
                for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                        current = current[part];
                    }
                    else {
                        hasProperty = false;
                        break;
                    }
                }
                if (value !== undefined && hasProperty) {
                    hasProperty = current === value;
                }
                addAssertion('equal', hasProperty, `Expected ${actual} to have property ${path}${value !== undefined ? ` = ${value}` : ''}`, value ?? 'exists', current);
            },
            toBeGreaterThan(num) {
                addAssertion('equal', actual > num, `Expected ${actual} to be greater than ${num}`, `> ${num}`, actual);
            },
            toBeGreaterThanOrEqual(num) {
                addAssertion('equal', actual >= num, `Expected ${actual} to be greater than or equal to ${num}`, `>= ${num}`, actual);
            },
            toBeLessThan(num) {
                addAssertion('equal', actual < num, `Expected ${actual} to be less than ${num}`, `< ${num}`, actual);
            },
            toBeLessThanOrEqual(num) {
                addAssertion('equal', actual <= num, `Expected ${actual} to be less than or equal to ${num}`, `<= ${num}`, actual);
            },
            toBeCloseTo(num, precision = 2) {
                const diff = Math.abs(actual - num);
                const close = diff < Math.pow(10, -precision) / 2;
                addAssertion('equal', close, `Expected ${actual} to be close to ${num} (precision: ${precision})`, num, actual);
            },
            toThrow(expected) {
                let threw = false;
                let thrownError;
                try {
                    actual();
                }
                catch (e) {
                    threw = true;
                    thrownError = e;
                }
                let matches = threw;
                if (expected && threw) {
                    if (typeof expected === 'string') {
                        matches = thrownError.message.includes(expected);
                    }
                    else if (expected instanceof RegExp) {
                        matches = expected.test(thrownError.message);
                    }
                    else if (expected instanceof Error) {
                        matches = thrownError.message === expected.message;
                    }
                }
                addAssertion('throws', matches, `Expected function to throw${expected ? ` ${expected}` : ''}`, expected ?? 'any error', thrownError);
            },
            toThrowError(expected) {
                this.toThrow(expected);
            },
            get resolves() {
                // Wrapper for async assertions
                return this;
            },
            get rejects() {
                return this;
            },
            get not() {
                isNegated = !isNegated;
                return chain;
            }
        };
        return chain;
    }
};
exports.Expect = Expect;
exports.Expect = Expect = __decorate([
    (0, inversify_1.injectable)()
], Expect);
let TestContext = class TestContext {
    constructor() {
        this.name = '';
        this.suite = '';
        this.timeout = 5000;
        this.retries = 0;
        this.expect = new Expect();
        this.logs = [];
        this.skipped = false;
    }
    isSkipped() {
        return this.skipped;
    }
    getSkipReason() {
        return this.skipReason;
    }
    skip(reason) {
        this.skipped = true;
        this.skipReason = reason;
        throw new SkipTestError(reason);
    }
    log(message, data) {
        this.logs.push({ level: 'info', message, timestamp: Date.now(), data });
    }
    warn(message, data) {
        this.logs.push({ level: 'warn', message, timestamp: Date.now(), data });
    }
    error(message, data) {
        this.logs.push({ level: 'error', message, timestamp: Date.now(), data });
    }
    debug(message, data) {
        this.logs.push({ level: 'debug', message, timestamp: Date.now(), data });
    }
    reset() {
        this.logs = [];
        this.skipped = false;
        this.skipReason = undefined;
        this.expect.clearAssertions();
    }
};
exports.TestContext = TestContext;
exports.TestContext = TestContext = __decorate([
    (0, inversify_1.injectable)()
], TestContext);
class SkipTestError extends Error {
    constructor(reason) {
        super(`Test skipped${reason ? `: ${reason}` : ''}`);
        this.reason = reason;
        this.name = 'SkipTestError';
    }
}
exports.SkipTestError = SkipTestError;
class TimeoutTestError extends Error {
    constructor(testName, timeoutMs) {
        super(`Test "${testName}" timed out after ${timeoutMs}ms`);
        this.testName = testName;
        this.timeoutMs = timeoutMs;
        this.name = 'TimeoutTestError';
    }
}
exports.TimeoutTestError = TimeoutTestError;
let TestSuiteBuilder = class TestSuiteBuilder {
    constructor() {
        this.suiteStack = [];
        this.nextConfig = {};
        this.suite = this.createEmptySuite('root');
        this.currentSuite = this.suite;
    }
    createEmptySuite(name) {
        return {
            id: `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            tests: [],
            config: {},
            nested: [],
        };
    }
    describe(name, fn) {
        const newSuite = this.createEmptySuite(name);
        newSuite.config = { ...this.nextConfig };
        this.nextConfig = {};
        this.currentSuite.nested.push(newSuite);
        this.suiteStack.push(this.currentSuite);
        this.currentSuite = newSuite;
        fn();
        this.currentSuite = this.suiteStack.pop();
        return this;
    }
    it(name, fn, config) {
        return this.test(name, fn, config);
    }
    test(name, fn, config) {
        const testCase = {
            id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            fn: fn,
            config: { ...this.nextConfig, ...config },
            type: 'unit',
        };
        this.nextConfig = {};
        this.currentSuite.tests.push(testCase);
        return this;
    }
    beforeAll(fn) {
        this.currentSuite.beforeAll = fn;
        return this;
    }
    afterAll(fn) {
        this.currentSuite.afterAll = fn;
        return this;
    }
    beforeEach(fn) {
        this.currentSuite.beforeEach = fn;
        return this;
    }
    afterEach(fn) {
        this.currentSuite.afterEach = fn;
        return this;
    }
    get skip() {
        this.nextConfig.skip = true;
        return this;
    }
    get only() {
        this.nextConfig.only = true;
        return this;
    }
    timeout(ms) {
        this.nextConfig.timeout = ms;
        return this;
    }
    retries(count) {
        this.nextConfig.retries = count;
        return this;
    }
    tags(...tags) {
        this.nextConfig.tags = tags;
        return this;
    }
    build() {
        return this.suite;
    }
};
exports.TestSuiteBuilder = TestSuiteBuilder;
exports.TestSuiteBuilder = TestSuiteBuilder = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], TestSuiteBuilder);
let TestRunner = class TestRunner {
    constructor() {
        this.running = false;
        this.shouldStop = false;
        this.eventHandlers = new Map();
        this.context = new TestContext();
        this.defaultTimeout = 5000;
        this.defaultRetries = 0;
    }
    async run(suite, filter) {
        return this.runAll([suite], filter);
    }
    async runAll(suites, filter) {
        if (this.running) {
            throw new Error('Test runner is already running');
        }
        this.running = true;
        this.shouldStop = false;
        const startTime = Date.now();
        const results = [];
        this.emit('start', { suites, filter, startTime });
        try {
            for (const suite of suites) {
                if (this.shouldStop)
                    break;
                await this.runSuite(suite, results, filter, []);
            }
        }
        finally {
            this.running = false;
        }
        const endTime = Date.now();
        const summary = {
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
    async runSuite(suite, results, filter, parentNames) {
        if (suite.config.skip)
            return;
        const suitePath = [...parentNames, suite.name];
        this.emit('suiteStart', { suite, path: suitePath });
        try {
            // beforeAll
            if (suite.beforeAll) {
                await suite.beforeAll();
            }
            // Run tests
            for (const test of suite.tests) {
                if (this.shouldStop)
                    break;
                if (this.shouldSkipTest(test, filter)) {
                    results.push(this.createSkippedResult(test, suitePath.join(' > ')));
                    continue;
                }
                const result = await this.runTest(test, suite, suitePath.join(' > '));
                results.push(result);
            }
            // Run nested suites
            for (const nested of suite.nested) {
                if (this.shouldStop)
                    break;
                await this.runSuite(nested, results, filter, suitePath);
            }
            // afterAll
            if (suite.afterAll) {
                await suite.afterAll();
            }
        }
        catch (error) {
            this.emit('error', { suite, error });
        }
        this.emit('suiteEnd', { suite, path: suitePath });
    }
    async runTest(test, suite, suitePath) {
        const startTime = Date.now();
        const timeout = test.config.timeout ?? suite.config.timeout ?? this.defaultTimeout;
        const maxRetries = test.config.retries ?? suite.config.retries ?? this.defaultRetries;
        let retryCount = 0;
        let lastError;
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
                    await test.fn(this.context);
                }, timeout, test.name);
                // afterEach
                if (suite.afterEach) {
                    await suite.afterEach();
                }
                // Test passed
                const endTime = Date.now();
                const result = {
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
            }
            catch (error) {
                if (error instanceof SkipTestError) {
                    const endTime = Date.now();
                    const result = {
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
                    const result = {
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
                    message: error.message,
                    stack: error.stack,
                    expected: error.expected,
                    actual: error.actual,
                };
                retryCount++;
            }
        }
        // All retries failed
        const endTime = Date.now();
        const result = {
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
    async runWithTimeout(fn, timeout, testName) {
        return new Promise((resolve, reject) => {
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
    shouldSkipTest(test, filter) {
        if (test.config.skip)
            return true;
        if (!filter)
            return false;
        if (filter.pattern) {
            const pattern = typeof filter.pattern === 'string' ? new RegExp(filter.pattern) : filter.pattern;
            if (!pattern.test(test.name))
                return true;
        }
        if (filter.tags && filter.tags.length > 0) {
            if (!test.config.tags || !filter.tags.some(t => test.config.tags.includes(t))) {
                return true;
            }
        }
        if (filter.types && filter.types.length > 0) {
            if (!filter.types.includes(test.type))
                return true;
        }
        return false;
    }
    createSkippedResult(test, suitePath) {
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
    stop() {
        this.shouldStop = true;
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }
    off(event, handler) {
        this.eventHandlers.get(event)?.delete(handler);
    }
    emit(event, data) {
        this.eventHandlers.get(event)?.forEach(handler => {
            try {
                handler(data);
            }
            catch (e) {
                console.error(`Error in test runner event handler for ${event}:`, e);
            }
        });
    }
};
exports.TestRunner = TestRunner;
exports.TestRunner = TestRunner = __decorate([
    (0, inversify_1.injectable)()
], TestRunner);
let TestReporter = class TestReporter {
    report(summary) {
        const lines = [];
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
    reportToConsole(summary) {
        console.log(this.report(summary));
    }
    reportToJson(summary) {
        return JSON.stringify(summary, null, 2);
    }
    reportToHtml(summary) {
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
    escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
exports.TestReporter = TestReporter;
exports.TestReporter = TestReporter = __decorate([
    (0, inversify_1.injectable)()
], TestReporter);
function createMock(implementation) {
    let currentImpl = implementation;
    const onceImpls = [];
    let returnValue;
    const onceReturnValues = [];
    const mock = function (...args) {
        mock.calls.push(args);
        mock.callCount++;
        if (onceImpls.length > 0) {
            const impl = onceImpls.shift();
            return impl(...args);
        }
        if (onceReturnValues.length > 0) {
            return onceReturnValues.shift();
        }
        if (returnValue !== undefined) {
            return returnValue;
        }
        if (currentImpl) {
            return currentImpl(...args);
        }
        return undefined;
    };
    mock.calls = [];
    mock.callCount = 0;
    mock.mockReturnValue = (value) => {
        returnValue = value;
        return mock;
    };
    mock.mockReturnValueOnce = (value) => {
        onceReturnValues.push(value);
        return mock;
    };
    mock.mockImplementation = (fn) => {
        currentImpl = fn;
        return mock;
    };
    mock.mockImplementationOnce = (fn) => {
        onceImpls.push(fn);
        return mock;
    };
    mock.mockResolvedValue = (value) => {
        returnValue = Promise.resolve(value);
        return mock;
    };
    mock.mockRejectedValue = (error) => {
        returnValue = Promise.reject(error);
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
function spyOn(object, method) {
    const original = object[method];
    const mock = createMock(original);
    object[method] = mock;
    return mock;
}
let TestWatcher = class TestWatcher {
    constructor() {
        this.watching = false;
        this.eventHandlers = new Map();
        this.watchers = [];
    }
    start(options, suites) {
        if (this.watching)
            return;
        this.watching = true;
        // Em ambiente de navegador/IDE, usaríamos FileSystemWatcher
        // Aqui fornecemos a estrutura para integração
        console.log('[TestWatcher] Started watching for changes');
        this.emit('change', { type: 'start', paths: options.paths });
    }
    stop() {
        if (!this.watching)
            return;
        this.watching = false;
        this.watchers.forEach(unwatch => unwatch());
        this.watchers = [];
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        console.log('[TestWatcher] Stopped watching');
    }
    isWatching() {
        return this.watching;
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }
    emit(event, data) {
        this.eventHandlers.get(event)?.forEach(handler => handler(data));
    }
};
exports.TestWatcher = TestWatcher;
exports.TestWatcher = TestWatcher = __decorate([
    (0, inversify_1.injectable)()
], TestWatcher);
let TestCoverage = class TestCoverage {
    constructor() {
        this.collecting = false;
        this.fileCoverages = new Map();
    }
    start() {
        if (this.collecting)
            return;
        this.collecting = true;
        this.fileCoverages.clear();
        // Integração com istanbul/nyc seria feita aqui
    }
    stop() {
        this.collecting = false;
        const files = Array.from(this.fileCoverages.values());
        const aggregate = (stat) => {
            if (stat === 'path' || stat === 'uncoveredLines') {
                return { total: 0, covered: 0, percentage: 0 };
            }
            const total = files.reduce((sum, f) => sum + f[stat].total, 0);
            const covered = files.reduce((sum, f) => sum + f[stat].covered, 0);
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
    isCollecting() {
        return this.collecting;
    }
    getCoverageFor(file) {
        return this.fileCoverages.get(file);
    }
};
exports.TestCoverage = TestCoverage;
exports.TestCoverage = TestCoverage = __decorate([
    (0, inversify_1.injectable)()
], TestCoverage);
let TestSystem = class TestSystem {
    constructor(runner, reporter, watcher, coverage) {
        this.runner = runner;
        this.reporter = reporter;
        this.watcher = watcher;
        this.coverage = coverage;
        this.expect = new Expect();
    }
    createSuite() {
        return new TestSuiteBuilder();
    }
    async run(suite, filter) {
        return this.runner.run(suite, filter);
    }
    async runAll(suites, filter) {
        return this.runner.runAll(suites, filter);
    }
    stop() {
        this.runner.stop();
    }
    watch(options, suites) {
        this.watcher.start(options, suites);
    }
    stopWatch() {
        this.watcher.stop();
    }
    getReport(summary, format = 'text') {
        switch (format) {
            case 'json':
                return this.reporter.reportToJson(summary);
            case 'html':
                return this.reporter.reportToHtml(summary);
            default:
                return this.reporter.report(summary);
        }
    }
    mock(fn) {
        return createMock(fn);
    }
    spyOn(object, method) {
        return spyOn(object, method);
    }
};
exports.TestSystem = TestSystem;
exports.TestSystem = TestSystem = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)('TestRunner')),
    __param(1, (0, inversify_1.inject)('TestReporter')),
    __param(2, (0, inversify_1.inject)('TestWatcher')),
    __param(3, (0, inversify_1.inject)('TestCoverage')),
    __metadata("design:paramtypes", [TestRunner,
        TestReporter,
        TestWatcher,
        TestCoverage])
], TestSystem);
// ============================================================================
// DEPENDENCY INJECTION - Container Module
// ============================================================================
exports.TEST_TYPES = {
    TestRunner: Symbol.for('TestRunner'),
    TestReporter: Symbol.for('TestReporter'),
    TestWatcher: Symbol.for('TestWatcher'),
    TestCoverage: Symbol.for('TestCoverage'),
    TestSystem: Symbol.for('TestSystem'),
    TestContext: Symbol.for('TestContext'),
    Expect: Symbol.for('Expect'),
};
exports.TestingContainerModule = new inversify_1.ContainerModule((bind) => {
    bind(exports.TEST_TYPES.TestRunner).to(TestRunner).inSingletonScope();
    bind(exports.TEST_TYPES.TestReporter).to(TestReporter).inSingletonScope();
    bind(exports.TEST_TYPES.TestWatcher).to(TestWatcher).inSingletonScope();
    bind(exports.TEST_TYPES.TestCoverage).to(TestCoverage).inSingletonScope();
    bind(exports.TEST_TYPES.TestContext).to(TestContext).inTransientScope();
    bind(exports.TEST_TYPES.Expect).to(Expect).inTransientScope();
    bind(exports.TEST_TYPES.TestSystem).to(TestSystem).inSingletonScope();
    // Bind named dependencies for TestSystem constructor
    bind('TestRunner').to(TestRunner).inSingletonScope();
    bind('TestReporter').to(TestReporter).inSingletonScope();
    bind('TestWatcher').to(TestWatcher).inSingletonScope();
    bind('TestCoverage').to(TestCoverage).inSingletonScope();
});
// ============================================================================
// QUICK START - Função helper para iniciar rapidamente
// ============================================================================
function createTestSystem() {
    const container = new inversify_1.Container();
    container.load(exports.TestingContainerModule);
    return container.get(exports.TEST_TYPES.TestSystem);
}
// DSL helpers para testes mais limpos
function describe(name, fn) {
    const builder = new TestSuiteBuilder();
    builder.describe(name, fn);
    return builder.build();
}
// Global expect helper
function expect(actual) {
    return new Expect().expect(actual);
}
// ============================================================================
// MODULE INFO
// ============================================================================
exports.TestingModuleInfo = {
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
