#!/usr/bin/env node
/**
 * Fix Common TypeScript Errors Script
 * Replaces invalid ternary patterns like `? 0` and `? null` with proper defaults
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const TARGET_DIR = resolve(process.cwd(), 'app/admin');

// Patterns to fix
const FIXES = [
  // Fix: `data?.prop ? 0` -> `data?.prop || 0`
  { pattern: /\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\?\s*0/g, replacement: '?.$1 || 0' },
  // Fix: `data?.prop ? null` -> `data?.prop || null`
  { pattern: /\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\?\s*null/g, replacement: '?.$1 || null' },
  // Fix: `obj?.prop ? []` -> `obj?.prop || []`
  { pattern: /\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\?\s*\[\]/g, replacement: '?.$1 || []' },
  // Fix: `obj?.prop ? {}` -> `obj?.prop || {}`
  { pattern: /\?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\?\s*\{\}/g, replacement: '?.$1 || {}' },
  // Fix: `data ? 0` -> `data || 0`
  { pattern: /\?\s*0(?!\d)/g, replacement: '|| 0' },
  // Fix: `data ? null` -> `data || null`  
  { pattern: /\?\s*null/g, replacement: '|| null' },
];

function processFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;
    
    for (const { pattern, replacement } of FIXES) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`Fixed: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return 0;
  }
}

function walkDir(dir, callback) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      callback(fullPath);
    }
  }
}

let fixedCount = 0;
walkDir(TARGET_DIR, (filePath) => {
  fixedCount += processFile(filePath);
});

console.log(`\nTotal files fixed: ${fixedCount}`);
