#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const required = [
  'packages/aethel-cli/package.json',
  'packages/aethel-cli/src/index.mjs',
  'packages/aethel-mcp-sdk/package.json',
  'packages/aethel-mcp-sdk/src/index.ts',
  'packages/aethel-plugin-sdk/package.json',
  'packages/aethel-plugin-sdk/src/index.ts',
];

const failures = [];

for (const relative of required) {
  if (!fs.existsSync(path.join(ROOT, relative))) failures.push(`${relative}: missing`);
}

for (const relative of [
  'packages/aethel-cli/package.json',
  'packages/aethel-mcp-sdk/package.json',
  'packages/aethel-plugin-sdk/package.json',
]) {
  if (!fs.existsSync(path.join(ROOT, relative))) continue;
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));
  if (pkg.private !== true) failures.push(`${relative}: private must remain true until public release`);
  if (pkg.version !== '0.0.0-private') failures.push(`${relative}: version must be 0.0.0-private`);
}

if (failures.length) {
  console.error('[ecosystem-skeletons] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[ecosystem-skeletons] PASS cli=true mcpSdk=true pluginSdk=true publishSafe=true');
