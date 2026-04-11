'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGitClient, GitConflict } from '@/lib/git/git-client';

interface ConflictSection {
  type: 'ours' | 'theirs' | 'base';
  content: string;
  startLine: number;
  endLine: number;
}

export default function MergeConflictResolver({ filePath }: { filePath: string }) {
  const [conflict, setConflict] = useState<GitConflict | null>(null);
  const [sections, setSections] = useState<ConflictSection[]>([]);
  const [resolution, setResolution] = useState<'ours' | 'theirs' | 'manual'>('manual');
  const [manualContent, setManualContent] = useState('');
  const [loading, setLoading] = useState(true);

  const gitClient = useMemo(() => getGitClient('/workspace'), []);

  const loadConflict = useCallback(async () => {
    setLoading(true);
    try {
      const conflicts = await gitClient.getConflicts();
      const fileConflict = conflicts.find(c => c.path === filePath);

      if (fileConflict) {
        setConflict(fileConflict);
        parseSections(fileConflict);
        setManualContent(fileConflict.ours); // Start with ours
      } else {
        setConflict(null);
        setSections([]);
        setManualContent('');
      }
    } catch (error) {
      console.error('Failed to load conflict:', error);
    } finally {
      setLoading(false);
    }
  }, [filePath, gitClient]);

  useEffect(() => {
    loadConflict();
  }, [loadConflict]);

  const parseSections = (conflict: GitConflict) => {
    const sections: ConflictSection[] = [];

    // Parse ours section
    const oursLines = conflict.ours.split('\n');
    sections.push({
      type: 'ours',
      content: conflict.ours,
      startLine: 0,
      endLine: oursLines.length
    });

    // Parse theirs section
    const theirsLines = conflict.theirs.split('\n');
    sections.push({
      type: 'theirs',
      content: conflict.theirs,
      startLine: 0,
      endLine: theirsLines.length
    });

    // Parse base section if available
    if (conflict.base) {
      const baseLines = conflict.base.split('\n');
      sections.push({
        type: 'base',
        content: conflict.base,
        startLine: 0,
        endLine: baseLines.length
      });
    }

    setSections(sections);
  };

  const handleResolve = async () => {
    if (!conflict) return;

    try {
      let content: string;

      if (resolution === 'ours') {
        content = conflict.ours;
      } else if (resolution === 'theirs') {
        content = conflict.theirs;
      } else {
        content = manualContent;
      }

      await gitClient.resolveConflict(conflict.path, resolution, content);

      // Notify parent component
      const event = new CustomEvent('conflict-resolved', {
        detail: { path: conflict.path }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const getDiffLines = () => {
    if (!conflict) return [];

    const oursLines = conflict.ours.split('\n');
    const theirsLines = conflict.theirs.split('\n');
    const maxLines = Math.max(oursLines.length, theirsLines.length);

    const diff: Array<{
      lineNumber: number;
      ours: string;
      theirs: string;
      status: 'same' | 'different' | 'added' | 'removed';
    }> = [];

    for (let i = 0; i < maxLines; i++) {
      const oursLine = oursLines[i] || '';
      const theirsLine = theirsLines[i] || '';

      let status: 'same' | 'different' | 'added' | 'removed' = 'same';

      if (oursLine === theirsLine) {
        status = 'same';
      } else if (!oursLine) {
        status = 'added';
      } else if (!theirsLine) {
        status = 'removed';
      } else {
        status = 'different';
      }

      diff.push({
        lineNumber: i + 1,
        ours: oursLine,
        theirs: theirsLine,
        status
      });
    }

    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--aethel-primary)]"></div>
      </div>
    );
  }

  if (!conflict) {
    return (
      <div className="text-center py-12 text-[var(--aethel-text-tertiary)]">
        No conflict found for this file
      </div>
    );
  }

  const diffLines = getDiffLines();

  return (
    <div className="h-full bg-gradient-to-br from-[var(--aethel-surface-primary)] via-[color-mix(in_srgb,var(--aethel-accent)_40%,black)] to-[var(--aethel-surface-primary)] p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--aethel-text-primary)] mb-2">Resolve Merge Conflict</h2>
        <p className="text-[var(--aethel-text-secondary)] font-mono text-sm">{conflict.path}</p>
      </div>

      {/* Resolution Options */}
      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm rounded-lg p-4 mb-6">
        <div className="flex gap-4">
          <button type="button"
            onClick={() => setResolution('ours')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              resolution === 'ours'
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
            }`}
          >
            <div className="font-semibold mb-1">Accept Current (Ours)</div>
            <div className="text-xs opacity-75">Keep your changes</div>
          </button>

          <button type="button"
            onClick={() => setResolution('theirs')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              resolution === 'theirs'
                ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
            }`}
          >
            <div className="font-semibold mb-1">Accept Incoming (Theirs)</div>
            <div className="text-xs opacity-75">Use their changes</div>
          </button>

          <button type="button"
            onClick={() => setResolution('manual')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              resolution === 'manual'
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
            }`}
          >
            <div className="font-semibold mb-1">Manual Resolution</div>
            <div className="text-xs opacity-75">Edit manually</div>
          </button>
        </div>
      </div>

      {/* Diff View */}
      {resolution === 'manual' ? (
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-[var(--aethel-text-primary)] font-semibold mb-3">Manual Editor</h3>
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            className="w-full h-96 p-4 bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] font-mono text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--aethel-info)]"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Ours */}
          <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-[var(--aethel-text-primary)] font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded-full"></span>
              Current Changes (Ours)
            </h3>
            <div className="bg-[var(--aethel-surface-primary)] rounded-lg p-4 h-96 overflow-y-auto">
              <pre className="text-sm text-[var(--aethel-text-primary)] font-mono whitespace-pre-wrap">
                {conflict.ours}
              </pre>
            </div>
          </div>

          {/* Theirs */}
          <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-[var(--aethel-text-primary)] font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded-full"></span>
              Incoming Changes (Theirs)
            </h3>
            <div className="bg-[var(--aethel-surface-primary)] rounded-lg p-4 h-96 overflow-y-auto">
              <pre className="text-sm text-[var(--aethel-text-primary)] font-mono whitespace-pre-wrap">
                {conflict.theirs}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Line-by-line Diff */}
      {resolution === 'manual' && (
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-[var(--aethel-text-primary)] font-semibold mb-3">Line-by-Line Comparison</h3>
          <div className="bg-[var(--aethel-surface-primary)] rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-[var(--aethel-surface-quaternary)]">
              {/* Headers */}
              <div className="bg-[var(--aethel-surface-secondary)] p-2 text-sm text-[var(--aethel-text-tertiary)] font-semibold">
                Current (Ours)
              </div>
              <div className="bg-[var(--aethel-surface-secondary)] p-2 text-sm text-[var(--aethel-text-tertiary)] font-semibold">
                Incoming (Theirs)
              </div>

              {/* Diff Lines */}
              {diffLines.map((line, index) => (
                <>
                  <div
                    key={`ours-${index}`}
                    className={`p-2 font-mono text-sm ${
                      line.status === 'same'
                        ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]'
                        : line.status === 'removed'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
                        : 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                    }`}
                  >
                    <span className="text-[var(--aethel-text-quaternary)] mr-4">{line.lineNumber}</span>
                    {line.ours || ' '}
                  </div>
                  <div
                    key={`theirs-${index}`}
                    className={`p-2 font-mono text-sm ${
                      line.status === 'same'
                        ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]'
                        : line.status === 'added'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                        : 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                    }`}
                  >
                    <span className="text-[var(--aethel-text-quaternary)] mr-4">{line.lineNumber}</span>
                    {line.theirs || ' '}
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Base Version (if available) */}
      {conflict.base && (
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-[var(--aethel-text-primary)] font-semibold mb-3">Base Version (Common Ancestor)</h3>
          <div className="bg-[var(--aethel-surface-primary)] rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-[var(--aethel-text-tertiary)] font-mono whitespace-pre-wrap">
              {conflict.base}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button type="button"
          onClick={handleResolve}
          className="flex-1 px-6 py-3 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] rounded-lg transition-colors font-semibold"
        >
          Mark as Resolved
        </button>
        <button type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
