#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function parseArgs(argv) {
    const result = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) {
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            result[key] = next;
            i += 1;
        } else {
            result[key] = 'true';
        }
    }
    return result;
}

function normalizeStatus(raw) {
    if (!raw) {
        return 'unknown';
    }
    const lc = raw.toLowerCase();
    if (lc === 'passed' || lc === 'failed' || lc === 'skipped' || lc === 'timedout' || lc === 'flaky' || lc === 'interrupted') {
        return lc === 'timedout' ? 'timedOut' : (lc === 'flaky' ? 'flaky' : (lc === 'passed' ? 'passed' : (lc === 'failed' ? 'failed' : (lc === 'skipped' ? 'skipped' : 'interrupted'))));
    }
    return raw;
}

function formatLocation(location) {
    if (!location || !location.file) {
        return undefined;
    }
    const parts = [location.file];
    if (typeof location.line === 'number') {
        parts.push(location.line);
        if (typeof location.column === 'number') {
            parts.push(location.column);
        }
    }
    return parts.join(':');
}

function extractFailureMessage(results) {
    if (!Array.isArray(results)) {
        return undefined;
    }
    for (const res of results) {
        if (res?.error?.message) {
            return res.error.message.trim();
        }
        if (res?.error?.stack) {
            return String(res.error.stack).split('\n')[0];
        }
    }
    return undefined;
}

function collectResults(report) {
    const stats = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
    const records = [];
    const failures = [];
    const projects = new Set();

    function visitSuite(suite, ancestors) {
        const currentAncestors = suite?.title ? [...ancestors, suite.title] : ancestors;
        for (const spec of suite?.specs ?? []) {
            const specTitle = spec.title ? [...currentAncestors, spec.title] : currentAncestors;
            for (const test of spec.tests ?? []) {
                const trail = test.title ? [...specTitle, test.title] : specTitle;
                const title = trail.filter(Boolean).join(' › ');
                const projectName = test.projectName || 'default';
                projects.add(projectName);
                const status = normalizeStatus(test.status || test.outcome);
                stats.total += 1;
                if (status === 'passed') {
                    stats.passed += 1;
                } else if (status === 'skipped') {
                    stats.skipped += 1;
                } else if (status === 'flaky') {
                    stats.flaky += 1;
                } else if (status === 'failed' || status === 'timedOut' || status === 'interrupted' || status === 'unknown') {
                    stats.failed += 1;
                }
                const failureMessage = extractFailureMessage(test.results);
                const location = formatLocation(spec.location || test.location);
                const durationMs = test.results?.[0]?.duration ?? 0;
                const record = {
                    title: title || '(unnamed test)',
                    project: projectName,
                    status: status || 'unknown',
                    durationMs,
                    location,
                    failureMessage
                };
                records.push(record);
                if (record.failureMessage || record.status === 'failed' || record.status === 'timedOut' || record.status === 'interrupted') {
                    failures.push(record);
                }
            }
        }
        for (const child of suite?.suites ?? []) {
            visitSuite(child, currentAncestors);
        }
    }

    for (const rootSuite of report?.suites ?? []) {
        visitSuite(rootSuite, []);
    }

    return { stats, records, failures, projects: Array.from(projects) };
}

function statusIcon(status) {
    switch (status) {
        case 'passed':
            return '✔';
        case 'failed':
            return '✖';
        case 'skipped':
            return '⚬';
        case 'timedOut':
            return '⏱';
        case 'flaky':
            return '≈';
        default:
            return '•';
    }
}

function formatTextReport(meta, options) {
    const { stats, records, failures, projects } = meta;
    const sampleSize = Number(options.sample ?? 12);
    const lines = [];
    const projectList = projects.length ? projects.join(', ') : 'n/a';
    lines.push(`Playwright run summary (projects: ${projectList})`);
    lines.push('');
    const totals = [`${stats.passed} passed`, `${stats.failed} failed`, `${stats.skipped} skipped`];
    if (stats.flaky) {
        totals.push(`${stats.flaky} flaky`);
    }
    lines.push(`${totals.join(', ')} (total ${stats.total})`);
    lines.push('');

    if (failures.length) {
        lines.push('Failed tests:');
        for (const failure of failures) {
            const location = failure.location ? ` — ${failure.location}` : '';
            const message = failure.failureMessage ? ` :: ${failure.failureMessage}` : '';
            lines.push(`- ${failure.title} [${failure.project}]${location}${message}`);
        }
    } else {
        lines.push('No failing tests. 🟢');
    }

    if (records.length) {
        lines.push('');
        const orderedSamples = [...failures, ...records.filter(r => !failures.includes(r))];
        const sample = orderedSamples.slice(0, Math.min(sampleSize, orderedSamples.length));
        lines.push(`Sample scenarios (${sample.length} of ${records.length}):`);
        for (const rec of sample) {
            const durationFragment = rec.durationMs ? ` (${rec.durationMs} ms)` : '';
            lines.push(`- ${statusIcon(rec.status)} ${rec.title} [${rec.project}]${durationFragment}`);
        }
    }

    return lines.join(os.EOL) + os.EOL;
}

function formatMarkdown(meta, summaryPathRel) {
    const { stats, failures, projects } = meta;
    const lines = [];
    lines.push('## Playwright summary');
    lines.push('');
    lines.push(`- Projects: ${projects.length ? projects.join(', ') : 'n/a'}`);
    lines.push(`- Passed: ${stats.passed}`);
    lines.push(`- Failed: ${stats.failed}`);
    lines.push(`- Skipped: ${stats.skipped}`);
    if (stats.flaky) {
        lines.push(`- Flaky: ${stats.flaky}`);
    }
    lines.push(`- Total: ${stats.total}`);
    lines.push(`- Summary file: ${summaryPathRel}`);
    if (failures.length) {
        lines.push('');
        lines.push('**Failed tests**');
        lines.push('');
        for (const failure of failures) {
            const message = failure.failureMessage ? ` — ${failure.failureMessage}` : '';
            lines.push(`- ${failure.title} [${failure.project}]${message}`);
        }
    }
    return lines.join('\n') + '\n';
}

(async () => {
    const args = parseArgs(process.argv.slice(2));
    const jsonPath = path.resolve(args.json || 'test-results/playwright.json');
    const outPath = path.resolve(args.out || 'diagnostics/PLAYWRIGHT_SUMMARY.txt');
    const summaryJsonPath = args.summaryJson ? path.resolve(args.summaryJson) : null;
    const githubSummaryPath = args.githubSummary ? path.resolve(args.githubSummary) : process.env.GITHUB_STEP_SUMMARY;

    if (!fs.existsSync(jsonPath)) {
        console.warn(`[playwright-summary] JSON report not found at ${jsonPath}; skipping summary generation.`);
        process.exit(0);
    }

    let report;
    try {
        report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (error) {
        console.error(`[playwright-summary] Failed to parse ${jsonPath}:`, error.message);
        process.exit(1);
    }

    const meta = collectResults(report);
    const text = formatTextReport(meta, { sample: args.sample });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, text, 'utf8');

    if (summaryJsonPath) {
        fs.mkdirSync(path.dirname(summaryJsonPath), { recursive: true });
        const payload = {
            generatedAt: new Date().toISOString(),
            sourceJson: path.relative(process.cwd(), jsonPath),
            summaryText: path.relative(process.cwd(), outPath),
            stats: meta.stats,
            projects: meta.projects,
            failures: meta.failures
        };
        fs.writeFileSync(summaryJsonPath, JSON.stringify(payload, null, 2));
    }

    if (githubSummaryPath) {
        const markdown = formatMarkdown(meta, path.relative(process.cwd(), outPath));
        fs.appendFileSync(githubSummaryPath, markdown, 'utf8');
    }

    console.log(`[playwright-summary] wrote ${path.relative(process.cwd(), outPath)}`);
})();
