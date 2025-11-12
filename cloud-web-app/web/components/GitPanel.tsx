'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface GitStatus {
  staged: string[];
  modified: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  currentBranch: string;
}

export default function GitPanel() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');

  useEffect(() => {
    fetchGitStatus();
  }, []);

  const fetchGitStatus = async () => {
    try {
      // Simulate fetching Git status - in real implementation, call backend API
      const response = await fetch('/api/git/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch Git status:', error);
      // Mock data for demonstration
      setStatus({
        staged: ['index.html', 'app/page.tsx'],
        modified: ['components/GitPanel.tsx'],
        untracked: ['newfile.txt'],
        ahead: 2,
        behind: 0,
        currentBranch: 'main'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    try {
      await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage }),
      });
      setCommitMessage('');
      fetchGitStatus();
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  if (loading) return <div>Loading Git status...</div>;

  return (
    <div className="git-panel p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Git - {status?.currentBranch}</h2>

      {status && status.ahead !== undefined && status.ahead > 0 && (
        <div className="mb-2 text-green-600">
          {status.ahead} commits ahead of origin
        </div>
      )}
      {status && status.behind !== undefined && status.behind > 0 && (
        <div className="mb-2 text-red-600">
          {status.behind} commits behind origin
        </div>
      )}

      {status && Array.isArray(status.staged) && status.staged.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold">Staged Changes:</h3>
          <ul className="list-disc list-inside">
            {status.staged.map(file => <li key={file}>{file}</li>)}
          </ul>
        </div>
      )}

      {status && Array.isArray(status.modified) && status.modified.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold">Modified Files:</h3>
          <ul className="list-disc list-inside">
            {status.modified.map(file => <li key={file}>{file}</li>)}
          </ul>
        </div>
      )}

      {status && Array.isArray(status.untracked) && status.untracked.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold">Untracked Files:</h3>
          <ul className="list-disc list-inside">
            {status.untracked.map(file => <li key={file}>{file}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full p-2 border rounded"
          rows={3}
        />
        <button
          onClick={handleCommit}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!commitMessage.trim()}
        >
          Commit
        </button>
      </div>
    </div>
  );
}
