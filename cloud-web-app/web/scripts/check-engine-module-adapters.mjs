#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_PATH = path.join(ROOT, 'lib/production/engine-module-integration-plan.ts');
const ADAPTERS_PATH = path.join(ROOT, 'lib/production/engine-module-adapters.ts');
const ADAPTERS_CATALOG_PATH = path.join(ROOT, 'lib/production/engine-module-adapters.catalog.ts');

const IGNORE_DIRS = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'docs',
  'node_modules',
]);

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(ROOT, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractObjectBlocks(source) {
  const blocks = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        blocks.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return blocks;
}

function getStringProperty(block, propertyName) {
  const match = block.match(new RegExp(`${propertyName}:\\s*'([^']+)'`));
  return match?.[1] ?? null;
}

function getArrayPropertyItems(block, propertyName) {
  const match = block.match(new RegExp(`${propertyName}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function extractDecisions(source) {
  return extractObjectBlocks(source)
    .map((block) => ({
      modulePath: getStringProperty(block, 'modulePath'),
      decision: getStringProperty(block, 'decision'),
      ownerSurface: getStringProperty(block, 'ownerSurface'),
      status: getStringProperty(block, 'status'),
    }))
    .filter((item) => item.modulePath && item.decision);
}

function extractAdapters(source) {
  return extractObjectBlocks(source)
    .map((block) => ({
      modulePath: getStringProperty(block, 'modulePath'),
      ownerSurface: getStringProperty(block, 'ownerSurface'),
      contractKind: getStringProperty(block, 'contractKind'),
      runtimeBoundary: getStringProperty(block, 'runtimeBoundary'),
      exportedContracts: getArrayPropertyItems(block, 'exportedContracts'),
      evidenceSignals: getArrayPropertyItems(block, 'evidenceSignals'),
    }))
    .filter((item) => item.modulePath && item.contractKind);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) return [];
      return walkFiles(fullPath);
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function routeExistsForSurface(surface) {
  if (!surface.startsWith('/studio/')) return false;
  const segment = surface.replace('/studio/', '');
  return fs.existsSync(path.join(ROOT, 'app/studio', segment, 'page.tsx'));
}

function findRetiredReferences(modulePath) {
  const moduleBase = path.basename(modulePath, path.extname(modulePath));
  const allowed = new Set([
    path.normalize('lib/production/engine-module-integration-plan.ts'),
    path.normalize('__tests__/production/engine-module-integration-plan.test.ts'),
  ]);

  return walkFiles(ROOT).filter((filePath) => {
    const relative = path.normalize(path.relative(ROOT, filePath));
    if (allowed.has(relative)) return false;
    const source = fs.readFileSync(filePath, 'utf8');
    return source.includes(modulePath) || source.includes(moduleBase);
  });
}

const failures = [];
const planSource = readRequired(PLAN_PATH);
const adapterSource = `${readRequired(ADAPTERS_PATH)}\n${readRequired(ADAPTERS_CATALOG_PATH)}`;
const decisions = extractDecisions(planSource);
const adapters = extractAdapters(adapterSource);
const adaptersByPath = new Map(adapters.map((adapter) => [adapter.modulePath, adapter]));

for (const decision of decisions) {
  if (decision.decision === 'wire') {
    const adapter = adaptersByPath.get(decision.modulePath);
    if (!adapter) failures.push(`${decision.modulePath}: wire decision has no adapter`);
    if (!fs.existsSync(path.join(ROOT, decision.modulePath))) {
      failures.push(`${decision.modulePath}: wired module file is missing`);
    }
    if (!routeExistsForSurface(decision.ownerSurface)) {
      failures.push(`${decision.modulePath}: owner surface ${decision.ownerSurface} has no route`);
    }
    if (decision.status !== 'adapter-wired') {
      failures.push(`${decision.modulePath}: wire status must be adapter-wired`);
    }
  }

  if (decision.decision === 'retire') {
    if (fs.existsSync(path.join(ROOT, decision.modulePath))) {
      failures.push(`${decision.modulePath}: retired module still exists`);
    }
    const references = findRetiredReferences(decision.modulePath);
    if (references.length > 0) {
      failures.push(
        `${decision.modulePath}: retired module still referenced by ${references
          .slice(0, 5)
          .map((filePath) => path.relative(ROOT, filePath))
          .join(', ')}`
      );
    }
    if (decision.status !== 'retired-confirmed') {
      failures.push(`${decision.modulePath}: retire status must be retired-confirmed`);
    }
  }
}

for (const adapter of adapters) {
  if (adapter.exportedContracts.length < 2) failures.push(`${adapter.modulePath}: missing exported contracts`);
  if (adapter.evidenceSignals.length < 2) failures.push(`${adapter.modulePath}: missing evidence signals`);
  if (!adapter.runtimeBoundary) failures.push(`${adapter.modulePath}: missing runtime boundary`);
  if (!adapterSource.includes(`'${adapter.contractKind}': () =>`)) {
    failures.push(`${adapter.modulePath}: contract ${adapter.contractKind} has no summary factory`);
  }
}

if (failures.length > 0) {
  console.error(`[engine-module-adapters] FAIL failures=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `[engine-module-adapters] PASS wired=${decisions.filter((item) => item.decision === 'wire').length} retired=${decisions.filter((item) => item.decision === 'retire').length} adapters=${adapters.length}`
);
