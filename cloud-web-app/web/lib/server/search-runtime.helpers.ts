/**
 * Pure helpers for the Aethel search runtime.
 */

import * as path from 'path';

// ==========================================================================
// SEARCH HELPERS
// ==========================================================================

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function shouldExclude(
  relativePath: string,
  name: string,
  excludeGlobs: string[],
  gitignorePatterns: string[]
): boolean {
  // Check direct matches
  for (const pattern of [...excludeGlobs, ...gitignorePatterns]) {
    if (matchesGlob(relativePath, [pattern]) || matchesGlob(name, [pattern])) {
      return true;
    }
  }

  // Check path segments
  const segments = relativePath.split(path.sep);
  for (const segment of segments) {
    if (excludeGlobs.includes(segment)) {
      return true;
    }
  }

  return false;
}

export function matchesGlob(filePath: string, patterns: string[]): boolean {
  // Simple glob matching (supports * and **)
  for (const pattern of patterns) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`, 'i');

    if (regex.test(filePath)) {
      return true;
    }
  }

  return false;
}

export function isBinaryFile(filename: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
    '.mp3', '.wav', '.ogg', '.mp4', '.webm', '.avi',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.woff', '.woff2', '.ttf', '.eot',
    '.bin', '.dat', '.db', '.sqlite',
  ];

  const ext = path.extname(filename).toLowerCase();
  return binaryExtensions.includes(ext);
}

export function fuzzyMatch(query: string, text: string): number {
  if (!query) return 0;

  let score = 0;
  let queryIndex = 0;
  let consecutiveBonus = 0;
  let lastMatchIndex = -1;

  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (text[i] === query[queryIndex]) {
      score += 1;

      // Consecutive match bonus
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 2;
      }

      // Start of word bonus
      if (i === 0 || text[i - 1] === '/' || text[i - 1] === '\\' || text[i - 1] === '.') {
        score += 5;
      }

      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // All characters matched?
  if (queryIndex === query.length) {
    score += consecutiveBonus;
    // Prefer shorter matches
    score += Math.max(0, 20 - text.length);
    return score;
  }

  return 0;
}

export function preserveCaseReplace(match: string, replacement: string): string {
  if (match === match.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (match === match.toLowerCase()) {
    return replacement.toLowerCase();
  }
  if (match[0] === match[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
  }
  return replacement;
}

export function inferSymbolKind(preview: string): number {
  // LSP SymbolKind
  if (preview.includes('class ')) return 5;   // Class
  if (preview.includes('interface ')) return 11; // Interface
  if (preview.includes('function ') || preview.includes('def ')) return 12; // Function
  if (preview.includes('type ')) return 15;   // TypeParameter
  if (preview.includes('const ') || preview.includes('let ') || preview.includes('var ')) return 13; // Variable
  return 0; // Unknown
}

export function getRipgrepCandidates(): string[] {
  return [
    'rg',
    'ripgrep',
    'C:\\Program Files\\ripgrep\\rg.exe',
    'C:\\Users\\%USERNAME%\\scoop\\apps\\ripgrep\\current\\rg.exe',
    path.join(process.env.VSCODE_CWD || '', 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg'),
  ];
}
