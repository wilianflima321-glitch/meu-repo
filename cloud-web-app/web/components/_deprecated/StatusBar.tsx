'use client';

import { useState, useEffect } from 'react';

interface StatusBarProps {
  gitBranch?: string;
  gitStatus?: { ahead: number; behind: number; changes: number };
  errors?: number;
  warnings?: number;
  language?: string;
  encoding?: string;
  lineEnding?: string;
  position?: { line: number; column: number };
  selection?: { lines: number; chars: number };
}

export default function StatusBar({
  gitBranch,
  gitStatus,
  errors = 0,
  warnings = 0,
  language,
  encoding = 'UTF-8',
  lineEnding = 'LF',
  position,
  selection
}: StatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 bg-[var(--aethel-surface-primary)] border-t border-[var(--aethel-border-primary)] flex items-center justify-between px-2 text-xs text-[var(--aethel-text-tertiary)]">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Git Branch */}
        {gitBranch && (
          <button className="flex items-center gap-1 hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
            <span className="text-xs font-semibold text-[var(--aethel-text-tertiary)]">GIT</span>
            <span>{gitBranch}</span>
            {gitStatus && (
              <>
                {gitStatus.ahead > 0 && <span className="text-green-400">↑{gitStatus.ahead}</span>}
                {gitStatus.behind > 0 && <span className="text-yellow-400">↓{gitStatus.behind}</span>}
                {gitStatus.changes > 0 && <span className="text-blue-400">*{gitStatus.changes}</span>}
              </>
            )}
          </button>
        )}

        {/* Problems */}
        <button className="flex items-center gap-2 hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
          {errors > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="text-xs font-semibold">ERR</span>
              <span>{errors}</span>
            </span>
          )}
          {warnings > 0 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="text-xs font-semibold">WARN</span>
              <span>{warnings}</span>
            </span>
          )}
          {errors === 0 && warnings === 0 && (
            <span className="text-green-400">✓ No Problems</span>
          )}
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Position */}
        {position && (
          <button className="hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
            Ln {position.line}, Col {position.column}
            {selection && selection.lines > 1 && (
              <span className="ml-2">
                ({selection.lines} lines, {selection.chars} chars selected)
              </span>
            )}
          </button>
        )}

        {/* Language */}
        {language && (
          <button className="hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
            {language}
          </button>
        )}

        {/* Encoding */}
        <button className="hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
          {encoding}
        </button>

        {/* Line Ending */}
        <button className="hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
          {lineEnding}
        </button>

        {/* Time */}
        <div className="px-2">
          {time.toLocaleTimeString()}
        </div>

        {/* Notifications */}
        <button className="hover:bg-[var(--aethel-surface-secondary)] px-2 py-1 rounded transition-colors">
          🔔
        </button>
      </div>
    </div>
  );
}
