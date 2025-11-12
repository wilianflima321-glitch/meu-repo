#!/usr/bin/env node
"use strict";

// Simple analysis script: read Playwright JSON summary if present and print a short report.
const fs = require('fs');
const path = require('path');

const summaryPath = process.argv[2] || path.join(process.cwd(), 'playwright-report', 'summary.json');

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

const summary = loadJson(summaryPath);
if (!summary) {
  console.error('No Playwright summary found at', summaryPath);
  process.exit(2);
}

const results = summary.suites || summary;
// Very small heuristic: count failures
let failed = 0, passed = 0, total = 0;
if (Array.isArray(results)) {
  results.forEach(s => {
    if (s.tests) s.tests.forEach(t => { total++; if (t.ok) passed++; else failed++; });
  });
}

console.log('Playwright summary:', { total, passed, failed });
if (failed > 0) process.exit(1);
process.exit(0);
