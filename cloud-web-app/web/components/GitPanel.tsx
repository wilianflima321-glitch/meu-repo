'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getGitClient, GitStatus, GitFileStatus } from '@/lib/git/git-client';
import { getConsentManager, createConsentRequest } from '@/lib/consent/consent-manager';
import ConsentDialog from './ConsentDialog';

export default function GitPanel() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showConsent, setShowConsent] = useState(false);
  const [consentRequest, setConsentRequest] = useState<any>(null);
  const [consentChargeId, setConsentChargeId] = useState<string>('');
  
  const gitClient = useMemo(() => getGitClient('/workspace'), []);
  const consentManager = useMemo(() => getConsentManager(), []);

  const fetchGitStatus = useCallback(async () => {
    try {
      const gitStatus = await gitClient.status();
      setStatus(gitStatus);
    } catch (error) {
      console.error('Failed to fetch Git status:', error);
    } finally {
      setLoading(false);
    }
  }, [gitClient]);

  useEffect(() => {
    fetchGitStatus();
    const interval = setInterval(fetchGitStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchGitStatus]);

  const handleStage = async (files: string[]) => {
    try {
      await gitClient.add(files);
      await fetchGitStatus();
    } catch (error) {
      console.error('Failed to stage files:', error);
    }
  };

  const handleUnstage = async (files: string[]) => {
    try {
      await gitClient.reset(files);
      await fetchGitStatus();
    } catch (error) {
      console.error('Failed to unstage files:', error);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    
    try {
      await gitClient.commit(commitMessage);
      setCommitMessage('');
      setSelectedFiles(new Set());
      await fetchGitStatus();
    } catch (error) {
      console.error('Commit failed:', error);
    }
  };

  const handlePush = async () => {
    // Request consent for push operation
    const request = createConsentRequest('git.push', {
      description: `Push ${status?.ahead || 0} commits to remote repository`,
      details: [
        `Branch: ${status?.branch}`,
        `Commits ahead: ${status?.ahead || 0}`,
        'This will upload your changes to the remote repository'
      ]
    });

    const response = await consentManager.requestConsent(request);
    
    if (response.approved) {
      try {
        await gitClient.push();
        await fetchGitStatus();
      } catch (error) {
        console.error('Push failed:', error);
      }
    } else {
      setConsentRequest(request);
      setConsentChargeId(response.chargeId);
      setShowConsent(true);
    }
  };

  const handlePull = async () => {
    try {
      await gitClient.pull();
      await fetchGitStatus();
    } catch (error) {
      console.error('Pull failed:', error);
    }
  };

  const handleConsentApprove = async (chargeId: string) => {
    await consentManager.approveConsent(chargeId);
    setShowConsent(false);
    await gitClient.push();
    await fetchGitStatus();
  };

  const handleConsentReject = async (chargeId: string) => {
    await consentManager.rejectConsent(chargeId);
    setShowConsent(false);
  };

  const toggleFileSelection = (path: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedFiles(newSelection);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="git-panel h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              Git - {status?.branch || 'main'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePull}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Pull
              </button>
              <button
                onClick={handlePush}
                disabled={!status?.ahead || status.ahead === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Push ({status?.ahead || 0})
              </button>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex gap-4 text-sm">
            {status && status.ahead > 0 && (
              <div className="text-green-400">
                Ahead: {status.ahead}
              </div>
            )}
            {status && status.behind > 0 && (
              <div className="text-red-400">
                Behind: {status.behind}
              </div>
            )}
          </div>
        </div>

        {/* Changes Sections */}
        <div className="space-y-6">
          {/* Staged Changes */}
          {status && status.staged.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Staged Changes ({status.staged.length})</h3>
                <button
                  onClick={() => handleUnstage(status.staged.map(f => f.path))}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Unstage All
                </button>
              </div>
              <div className="space-y-2">
                {status.staged.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"
                    onClick={() => toggleFileSelection(file.path)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.path)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                    <span className="text-green-400">{getStatusIcon(file.status)}</span>
                    <span className="flex-1 text-slate-300">{file.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unstaged Changes */}
          {status && status.unstaged.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Changes ({status.unstaged.length})</h3>
                <button
                  onClick={() => handleStage(status.unstaged.map(f => f.path))}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Stage All
                </button>
              </div>
              <div className="space-y-2">
                {status.unstaged.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"
                    onClick={() => handleStage([file.path])}
                  >
                    <span className="text-yellow-400">{getStatusIcon(file.status)}</span>
                    <span className="flex-1 text-slate-300">{file.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Untracked Files */}
          {status && status.untracked.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Untracked Files ({status.untracked.length})</h3>
              <div className="space-y-2">
                {status.untracked.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"
                    onClick={() => handleStage([file.path])}
                  >
                    <span className="text-slate-400">?</span>
                    <span className="flex-1 text-slate-300">{file.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflicted Files */}
          {status && status.conflicted.length > 0 && (
            <div className="bg-red-900/20 backdrop-blur-sm rounded-lg p-4 border border-red-500">
              <h3 className="font-semibold text-red-400 mb-3">Conflicts ({status.conflicted.length})</h3>
              <div className="space-y-2">
                {status.conflicted.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 p-2 bg-red-900/30 rounded"
                  >
                      <span className="text-red-400 text-xs font-semibold">WARN</span>
                    <span className="flex-1 text-red-300">{file.path}</span>
                    <button className="text-sm text-red-400 hover:text-red-300">
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Commit Section */}
        {status && status.staged.length > 0 && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Commit Changes</h3>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="w-full p-3 bg-slate-700 text-white rounded-lg mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
              rows={3}
            />
            <button
              onClick={handleCommit}
              disabled={!commitMessage.trim()}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Commit {status.staged.length} file{status.staged.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {/* Consent Dialog */}
      {showConsent && consentRequest && (
        <ConsentDialog
          request={consentRequest}
          chargeId={consentChargeId}
          onApprove={handleConsentApprove}
          onReject={handleConsentReject}
          onClose={() => setShowConsent(false)}
        />
      )}
    </>
  );
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'added': return 'A';
    case 'modified': return 'M';
    case 'deleted': return 'D';
    case 'renamed': return 'R';
    case 'copied': return 'C';
    default: return 'M';
  }
}
