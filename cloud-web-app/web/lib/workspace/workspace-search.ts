import type { SearchMatch, SearchOptions } from './workspace-service.types';

export function buildSearchRegex(options: SearchOptions): RegExp {
  let pattern = options.useRegex ? options.query : escapeRegex(options.query);

  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const flags = options.caseSensitive ? 'g' : 'gi';
  return new RegExp(pattern, flags);
}

export function matchesSearchPattern(
  path: string,
  includePattern: string | undefined,
  excludePattern: string | undefined,
  matchPattern: (path: string, pattern: string) => boolean,
): boolean {
  if (excludePattern && matchPattern(path, excludePattern)) {
    return false;
  }

  if (includePattern && !matchPattern(path, includePattern)) {
    return false;
  }

  return true;
}

export function findMatches(content: string, regex: RegExp): SearchMatch[] {
  const matches: SearchMatch[] = [];
  const lines = content.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match: RegExpExecArray | null;

    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      matches.push({
        line: lineIndex + 1,
        column: match.index + 1,
        length: match[0].length,
        text: match[0],
        preview: getLinePreview(line, match.index),
      });
    }
  }

  return matches;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLinePreview(line: string, matchIndex: number): string {
  const maxLength = 100;
  const start = Math.max(0, matchIndex - 20);
  const end = Math.min(line.length, start + maxLength);

  let preview = line.substring(start, end);

  if (start > 0) preview = '...' + preview;
  if (end < line.length) preview = preview + '...';

  return preview;
}
