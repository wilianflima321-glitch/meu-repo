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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!conflict) {
    return (
      <div className="text-center py-12 text-slate-400">
        No conflict found for this file
      </div>
    );
  }

  const diffLines = getDiffLines();

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Resolve Merge Conflict</h2>
        <p className="text-slate-300 font-mono text-sm">{conflict.path}</p>
      </div>

      {/* Resolution Options */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setResolution('ours')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              resolution === 'ours'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="font-semibold mb-1">Accept Current (Ours)</div>
            <div className="text-xs opacity-75">Keep your changes</div>
          </button>
          
          <button
            onClick={() => setResolution('theirs')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              resolution === 'theirs'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="font-semibold mb-1">Accept Incoming (Theirs)</div>
            <div className="text-xs opacity-75">Use their changes</div>
          </button>
          
          <button
            onClick={() => setResolution('manual')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
              resolution === 'manual'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <div className="font-semibold mb-1">Manual Resolution</div>
            <div className="text-xs opacity-75">Edit manually</div>
          </button>
        </div>
      </div>

      {/* Diff View */}
      {resolution === 'manual' ? (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Manual Editor</h3>
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            className="w-full h-96 p-4 bg-slate-900 text-white font-mono text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Ours */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Current Changes (Ours)
            </h3>
            <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto">
              <pre className="text-sm text-white font-mono whitespace-pre-wrap">
                {conflict.ours}
              </pre>
            </div>
          </div>

          {/* Theirs */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Incoming Changes (Theirs)
            </h3>
            <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto">
              <pre className="text-sm text-white font-mono whitespace-pre-wrap">
                {conflict.theirs}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Line-by-line Diff */}
      {resolution === 'manual' && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Line-by-Line Comparison</h3>
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-slate-700">
              {/* Headers */}
              <div className="bg-slate-800 p-2 text-sm text-slate-400 font-semibold">
                Current (Ours)
              </div>
              <div className="bg-slate-800 p-2 text-sm text-slate-400 font-semibold">
                Incoming (Theirs)
              </div>

              {/* Diff Lines */}
              {diffLines.map((line, index) => (
                <>
                  <div
                    key={`ours-${index}`}
                    className={`p-2 font-mono text-sm ${
                      line.status === 'same'
                        ? 'bg-slate-900 text-slate-400'
                        : line.status === 'removed'
                        ? 'bg-red-900/30 text-red-300'
                        : 'bg-blue-900/30 text-blue-300'
                    }`}
                  >
                    <span className="text-slate-600 mr-4">{line.lineNumber}</span>
                    {line.ours || ' '}
                  </div>
                  <div
                    key={`theirs-${index}`}
                    className={`p-2 font-mono text-sm ${
                      line.status === 'same'
                        ? 'bg-slate-900 text-slate-400'
                        : line.status === 'added'
                        ? 'bg-green-900/30 text-green-300'
                        : 'bg-green-900/30 text-green-300'
                    }`}
                  >
                    <span className="text-slate-600 mr-4">{line.lineNumber}</span>
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
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
          <h3 className="text-white font-semibold mb-3">Base Version (Common Ancestor)</h3>
          <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-slate-400 font-mono whitespace-pre-wrap">
              {conflict.base}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleResolve}
          className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
        >
          Mark as Resolved
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
