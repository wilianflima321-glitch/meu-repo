/**
 * Problems Panel Component
 * Displays diagnostics and errors from LSP
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getProblemsManager, Diagnostic, ProblemFilter, ProblemStats } from '../../lib/problems/problems-manager';

export const ProblemsPanel: React.FC = () => {
  const [problems, setProblems] = useState<Diagnostic[]>([]);
  const [stats, setStats] = useState<ProblemStats>({ errors: 0, warnings: 0, infos: 0, hints: 0, total: 0 });
  const [filter, setFilter] = useState<ProblemFilter>({});
  const [groupBy, setGroupBy] = useState<'file' | 'severity'>('file');
  const [selectedProblem, setSelectedProblem] = useState<number | null>(null);

  const problemsManager = getProblemsManager();

  // Load problems
  useEffect(() => {
    const updateProblems = () => {
      const allProblems = problemsManager.getProblems(filter);
      setProblems(allProblems);
      setStats(problemsManager.getStats());
    };

    updateProblems();

    // Listen to changes
    const unsubscribe = problemsManager.onDidChangeProblems(updateProblems);
    return unsubscribe;
  }, [filter, problemsManager]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: Partial<ProblemFilter>) => {
    setFilter({ ...filter, ...newFilter });
  }, [filter]);

  // Handle problem click
  const handleProblemClick = useCallback((index: number, problem: Diagnostic) => {
    setSelectedProblem(index);
    window.dispatchEvent(
      new CustomEvent('aethel.problems.openLocation', {
        detail: {
          uri: problem.uri,
          line: problem.range.start.line,
          column: problem.range.start.character,
        },
      })
    );
  }, []);

  // Handle quick fix
  const handleQuickFix = useCallback(async (problem: Diagnostic) => {
    try {
      const fixes = await problemsManager.getQuickFixes(problem);
      if (fixes.length > 0) {
        // Show quick fix menu
        // For now, apply first fix
        await problemsManager.applyQuickFix(fixes[0]);
      }
    } catch (error) {
      console.error('Quick fix failed:', error);
    }
  }, [problemsManager]);

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return 'ERR';
      case 'warning': return 'WARN';
      case 'info': return 'INFO';
      case 'hint': return 'HINT';
      default: return '•';
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#f14c4c';
      case 'warning': return '#cca700';
      case 'info': return '#3794ff';
      case 'hint': return '#75beff';
      default: return 'inherit';
    }
  };

  // Group problems
  const groupedProblems = groupBy === 'file'
    ? Array.from(problemsManager.groupByFile().entries())
    : Array.from(problemsManager.groupBySeverity().entries());

  return (
    <div className="problems-panel">
      <div className="problems-header">
        <div className="problems-title">
          <span>Problems</span>
          <span className="problems-count">
            {stats.errors > 0 && <span className="error-count">{stats.errors} ERR</span>}
            {stats.warnings > 0 && <span className="warning-count">{stats.warnings} WARN</span>}
          </span>
        </div>

        <div className="problems-actions">
          <select
            className="group-by-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'file' | 'severity')}
          >
            <option value="file">Group by File</option>
            <option value="severity">Group by Severity</option>
          </select>

          <div className="filter-buttons">
            <button
              className={`filter-button ${!filter.severity ? 'active' : ''}`}
              onClick={() => handleFilterChange({ severity: undefined })}
            >
              All
            </button>
            <button
              className={`filter-button ${filter.severity === 'error' ? 'active' : ''}`}
              onClick={() => handleFilterChange({ severity: 'error' })}
            >
              Errors
            </button>
            <button
              className={`filter-button ${filter.severity === 'warning' ? 'active' : ''}`}
              onClick={() => handleFilterChange({ severity: 'warning' })}
            >
              Warnings
            </button>
          </div>
        </div>
      </div>

      <div className="problems-list">
        {groupedProblems.length === 0 ? (
          <div className="no-problems">No problems detected</div>
        ) : (
          groupedProblems.map(([group, groupProblems]) => (
            <div key={group} className="problem-group">
              <div className="group-header">
                <span className="group-name">{group}</span>
                <span className="group-count">{groupProblems.length}</span>
              </div>

              {groupProblems.map((problem, index) => (
                <div
                  key={`${problem.uri}-${problem.range.start.line}-${problem.range.start.character}`}
                  className={`problem-item ${selectedProblem === index ? 'selected' : ''}`}
                  onClick={() => handleProblemClick(index, problem)}
                >
                  <span
                    className="severity-icon"
                    style={{ color: getSeverityColor(problem.severity) }}
                  >
                    {getSeverityIcon(problem.severity)}
                  </span>

                  <div className="problem-content">
                    <div className="problem-message">{problem.message}</div>
                    <div className="problem-location">
                      {problem.uri.split('/').pop()} [{problem.range.start.line + 1}, {problem.range.start.character + 1}]
                      {problem.source && <span className="problem-source"> - {problem.source}</span>}
                    </div>
                  </div>

                  <button
                    className="quick-fix-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFix(problem);
                    }}
                    title="Quick Fix"
                  >
                    💡
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .problems-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--panel-bg);
          color: var(--editor-fg);
        }

        .problems-header {
          padding: 8px 16px;
          border-bottom: 1px solid var(--panel-border);
        }

        .problems-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
        }

        .problems-count {
          display: flex;
          gap: 12px;
          font-size: 12px;
        }

        .error-count {
          color: #f14c4c;
        }

        .warning-count {
          color: #cca700;
        }

        .problems-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .group-by-select {
          padding: 4px 8px;
          background: var(--editor-bg);
          border: 1px solid var(--panel-border);
          color: var(--editor-fg);
          font-size: 12px;
          border-radius: 3px;
        }

        .filter-buttons {
          display: flex;
          gap: 4px;
        }

        .filter-button {
          padding: 4px 12px;
          background: var(--editor-bg);
          border: 1px solid var(--panel-border);
          color: var(--editor-fg);
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
        }

        .filter-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .filter-button.active {
          background: var(--activitybar-activeBorder);
          color: white;
          border-color: var(--activitybar-activeBorder);
        }

        .problems-list {
          flex: 1;
          overflow-y: auto;
        }

        .no-problems {
          padding: 32px;
          text-align: center;
          color: var(--editor-fg);
          opacity: 0.6;
        }

        .problem-group {
          margin-bottom: 8px;
        }

        .group-header {
          display: flex;
          justify-content: space-between;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 12px;
          font-weight: 600;
        }

        .group-count {
          opacity: 0.6;
        }

        .problem-item {
          display: flex;
          align-items: flex-start;
          padding: 8px 16px;
          cursor: pointer;
          border-left: 3px solid transparent;
        }

        .problem-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .problem-item.selected {
          background: var(--editor-selectionBackground);
          border-left-color: var(--activitybar-activeBorder);
        }

        .severity-icon {
          margin-right: 8px;
          font-size: 14px;
        }

        .problem-content {
          flex: 1;
          min-width: 0;
        }

        .problem-message {
          font-size: 13px;
          margin-bottom: 4px;
        }

        .problem-location {
          font-size: 11px;
          opacity: 0.7;
        }

        .problem-source {
          font-style: italic;
        }

        .quick-fix-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 0 8px;
          opacity: 0;
        }

        .problem-item:hover .quick-fix-button {
          opacity: 1;
        }

        .quick-fix-button:hover {
          opacity: 1 !important;
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
};
