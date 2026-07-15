import { spawn } from 'child_process';
import * as path from 'path';
import { logger } from '@/lib/observability/logger';
import type { SearchMatch, SearchOptions } from './search-runtime.types';

type RipgrepMatchData = {
  path: { text: string };
  line_number: number;
  lines: { text: string };
  submatches: Array<{ start: number; end: number }>;
};

type RipgrepJsonLine = {
  type?: string;
  data?: unknown;
};

function isRipgrepMatchData(data: unknown): data is RipgrepMatchData {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<RipgrepMatchData>;
  return (
    typeof candidate.line_number === 'number' &&
    !!candidate.path &&
    typeof candidate.path.text === 'string' &&
    !!candidate.lines &&
    typeof candidate.lines.text === 'string' &&
    Array.isArray(candidate.submatches)
  );
}

function buildRipgrepArgs(options: SearchOptions): string[] {
  const {
    query,
    workspaceRoot,
    isRegex,
    isCaseSensitive,
    isWholeWord,
    includePattern,
    excludePattern,
    maxResults = 10000,
    useGitignore,
    contextLines = 2,
  } = options;

  const args: string[] = ['--json', '--line-number', '--column', '--max-count', String(maxResults)];

  if (contextLines > 0) args.push('--context', String(contextLines));
  if (!isCaseSensitive) args.push('--ignore-case');
  if (isWholeWord) args.push('--word-regexp');
  args.push(isRegex ? '--pcre2' : '--fixed-strings');
  if (!useGitignore) args.push('--no-ignore');

  if (includePattern) {
    for (const pattern of includePattern.split(',').map((value) => value.trim())) {
      if (pattern) args.push('--glob', pattern);
    }
  }

  if (excludePattern) {
    for (const pattern of excludePattern.split(',').map((value) => value.trim())) {
      if (pattern) args.push('--glob', `!${pattern}`);
    }
  }

  args.push('--glob', '!node_modules/**');
  args.push('--glob', '!.git/**');
  args.push('--glob', '!dist/**');
  args.push('--glob', '!build/**');
  args.push('--glob', '!*.min.js');
  args.push('--glob', '!*.min.css');
  args.push('--', query, workspaceRoot);

  return args;
}

function appendRipgrepMatch(matches: SearchMatch[], workspaceRoot: string, data: RipgrepMatchData) {
  const relativePath = path.relative(workspaceRoot, data.path.text);

  for (const submatch of data.submatches) {
    matches.push({
      file: relativePath,
      line: data.line_number,
      column: submatch.start + 1,
      length: submatch.end - submatch.start,
      preview: data.lines.text.trim(),
      previewStart: submatch.start,
      contextBefore: [],
      contextAfter: [],
    });
  }
}

export async function searchWithRipgrep(
  ripgrepPath: string,
  options: SearchOptions,
): Promise<{ matches: SearchMatch[]; truncated: boolean }> {
  const args = buildRipgrepArgs(options);
  const { workspaceRoot, maxResults = 10000 } = options;

  return new Promise((resolve, reject) => {
    const matches: SearchMatch[] = [];
    let truncated = false;
    const rg = spawn(ripgrepPath, args, {
      cwd: workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';

    rg.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const json = JSON.parse(line) as RipgrepJsonLine;
          if (json.type === 'match' && isRipgrepMatchData(json.data)) {
            appendRipgrepMatch(matches, workspaceRoot, json.data);
          } else if (
            json.type === 'summary' &&
            json.data &&
            typeof json.data === 'object' &&
            'stats' in json.data &&
            typeof (json.data as { stats?: { matches?: unknown } }).stats?.matches === 'number' &&
            (json.data as { stats: { matches: number } }).stats.matches >= maxResults
          ) {
            truncated = true;
          }
        } catch {
          // Ignore malformed ripgrep JSON lines.
        }
      }
    });

    rg.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      if (!error.includes('No files were searched')) {
        logger.warn('[SearchRuntime] ripgrep warning:', error);
      }
    });

    rg.on('close', () => {
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer) as RipgrepJsonLine;
          if (json.type === 'match' && isRipgrepMatchData(json.data)) {
            appendRipgrepMatch(matches, workspaceRoot, json.data);
          }
        } catch {
          // Ignore trailing parse errors.
        }
      }

      resolve({ matches, truncated });
    });

    rg.on('error', reject);
  });
}
