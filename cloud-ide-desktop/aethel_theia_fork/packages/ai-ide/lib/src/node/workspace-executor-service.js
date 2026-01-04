"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceExecutorService = void 0;
const inversify_1 = require("inversify");
const child_process_1 = require("child_process");
const MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
const DEFAULT_TIMEOUT = 30000; // 30s
let WorkspaceExecutorService = class WorkspaceExecutorService {
    constructor() {
        this.executionCount = 0;
        this.metrics = {
            total: 0,
            success: 0,
            failed: 0,
            timedOut: 0,
            truncated: 0,
            terminated: 0,
            durations: []
        };
    }
    async execute(request) {
        return this.executeWithProgress(request, () => { });
    }
    async executeWithProgress(request, onProgress) {
        const startTime = Date.now();
        const timeout = request.timeout || DEFAULT_TIMEOUT;
        const requestId = request.requestId || `exec-${++this.executionCount}`;
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            let truncated = false;
            let timedOut = false;
            let wasTerminated = false;
            const [cmd, ...args] = this.parseCommand(request.command);
            const proc = (0, child_process_1.spawn)(cmd, args, {
                cwd: request.cwd || process.cwd(),
                shell: true,
                env: { ...process.env }
            });
            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                proc.kill('SIGTERM');
                setTimeout(() => proc.kill('SIGKILL'), 1000);
            }, timeout);
            proc.stdout?.on('data', (data) => {
                const chunk = data.toString();
                if (stdout.length + chunk.length > MAX_OUTPUT_SIZE) {
                    truncated = true;
                    proc.kill('SIGTERM');
                    return;
                }
                stdout += chunk;
                onProgress({
                    type: 'stdout',
                    data: chunk,
                    timestamp: Date.now()
                });
            });
            proc.stderr?.on('data', (data) => {
                const chunk = data.toString();
                if (stderr.length + chunk.length > MAX_OUTPUT_SIZE) {
                    truncated = true;
                    proc.kill('SIGTERM');
                    return;
                }
                stderr += chunk;
                onProgress({
                    type: 'stderr',
                    data: chunk,
                    timestamp: Date.now()
                });
            });
            proc.on('exit', (code, signal) => {
                clearTimeout(timeoutHandle);
                const duration = Date.now() - startTime;
                if (signal) {
                    wasTerminated = true;
                }
                const exitCode = code ?? (wasTerminated ? -1 : 0);
                const result = {
                    exitCode,
                    stdout,
                    stderr,
                    truncated,
                    timedOut,
                    wasTerminated,
                    duration
                };
                this.recordMetrics(result);
                onProgress({
                    type: 'exit',
                    data: `Exit code: ${exitCode}`,
                    timestamp: Date.now()
                });
                resolve(result);
            });
            proc.on('error', (err) => {
                clearTimeout(timeoutHandle);
                const duration = Date.now() - startTime;
                const result = {
                    exitCode: -1,
                    stdout,
                    stderr: stderr + '\n' + err.message,
                    truncated,
                    timedOut,
                    wasTerminated: true,
                    duration
                };
                this.recordMetrics(result);
                onProgress({
                    type: 'error',
                    data: err.message,
                    timestamp: Date.now()
                });
                resolve(result);
            });
        });
    }
    parseCommand(command) {
        // Simple command parsing - in production use a proper shell parser
        return command.split(/\s+/);
    }
    recordMetrics(result) {
        this.metrics.total++;
        this.metrics.durations.push(result.duration);
        if (result.exitCode === 0) {
            this.metrics.success++;
        }
        else {
            this.metrics.failed++;
        }
        if (result.timedOut)
            this.metrics.timedOut++;
        if (result.truncated)
            this.metrics.truncated++;
        if (result.wasTerminated)
            this.metrics.terminated++;
        // Keep only last 1000 durations for percentile calculation
        if (this.metrics.durations.length > 1000) {
            this.metrics.durations = this.metrics.durations.slice(-1000);
        }
    }
    getMetrics() {
        const sorted = [...this.metrics.durations].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
        return {
            ...this.metrics,
            p95,
            p99,
            durations: undefined // Don't expose raw durations
        };
    }
    exportMetricsPrometheus() {
        const metrics = this.getMetrics();
        return `
# HELP ai_executor_total Total number of executions
# TYPE ai_executor_total counter
ai_executor_total ${metrics.total}

# HELP ai_executor_success Successful executions
# TYPE ai_executor_success counter
ai_executor_success ${metrics.success}

# HELP ai_executor_failed Failed executions
# TYPE ai_executor_failed counter
ai_executor_failed ${metrics.failed}

# HELP ai_executor_timed_out Timed out executions
# TYPE ai_executor_timed_out counter
ai_executor_timed_out ${metrics.timedOut}

# HELP ai_executor_truncated Truncated executions
# TYPE ai_executor_truncated counter
ai_executor_truncated ${metrics.truncated}

# HELP ai_executor_terminated Terminated executions
# TYPE ai_executor_terminated counter
ai_executor_terminated ${metrics.terminated}

# HELP ai_executor_duration_p95 95th percentile duration (ms)
# TYPE ai_executor_duration_p95 gauge
ai_executor_duration_p95 ${metrics.p95}

# HELP ai_executor_duration_p99 99th percentile duration (ms)
# TYPE ai_executor_duration_p99 gauge
ai_executor_duration_p99 ${metrics.p99}
`.trim();
    }
};
exports.WorkspaceExecutorService = WorkspaceExecutorService;
exports.WorkspaceExecutorService = WorkspaceExecutorService = __decorate([
    (0, inversify_1.injectable)()
], WorkspaceExecutorService);
