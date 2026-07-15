#!/usr/bin/env node
/**
 * Fix Remaining TypeScript Errors Script
 * Replaces invalid ternary patterns in admin files
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const TARGET_DIR = resolve(process.cwd(), 'app/admin');

// Read file content
function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
}

// Write file content
function writeFile(filePath, content) {
  try {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Walk directory recursively
function walkDir(dir, callback) {
  try {
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
  } catch (err) {
    // Ignore errors
  }
}

// Fix specific patterns in a file
function fixFile(filePath) {
  let content = readFile(filePath);
  if (!content) return 0;

  let modified = false;
  const originalContent = content;

  // Pattern 1: `something ? 0 : number` -> `something || 0` (in refreshInterval)
  // This is actually valid, skip it

  // Pattern 2: `condition ? null : value` -> `condition ? null : value` is valid
  // But `condition || null : value` is wrong - fix the || back to ?
  content = content.replace(/isPaused\s*\|\|\s*0\s*:/g, 'isPaused ? 0 :');

  // Pattern 3: Fix `? 0` that should be `|| 0` (not in ternary)
  content = content.replace(/([^?])\?\s*0\s*([^:])/g, '$1|| 0$2');

  // Pattern 4: Fix `? null` that should be `|| null` (not in ternary)  
  content = content.replace(/([^?])\?\s*null\s*([^:])/g, '$1|| null$2');

  // Pattern 5: Fix specific broken patterns from bad replacements
  content = content.replace(/isPaused \|\| 0 :/g, 'isPaused ? 0 :');

  if (content !== originalContent) {
    if (writeFile(filePath, content)) {
      console.log(`Fixed: ${filePath}`);
      return 1;
    }
  }
  return 0;
}

// Main execution
let fixedCount = 0;
walkDir(TARGET_DIR, (filePath) => {
  fixedCount += fixFile(filePath);
});

console.log(`\nTotal files fixed: ${fixedCount}`);
