'use client';

/**
 * Git Panel Component
 * 
 * Interface completa para Git com staging, commits,
 * branches, diff viewer e mais.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Plus,
  Minus,
  Check,
  X,
  RefreshCw,
  Upload,
  Download,
  FolderGit,
  File,
  FileText,
  FilePlus,
  FileX,
  FileDiff,
  ChevronRight,
  ChevronDown,
  Clock,
  User,
  Tag,
  Inbox,
  MoreVertical,
  Search,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
  Eye,
  Copy,
} from 'lucide-react';
import type {
  GitService,
  GitStatus,
  GitCommit as GitCommitType,
  GitBranch as GitBranchType,
  GitStash,
  GitDiff,
  GitFileStatus,
} from '@/lib/git/git-service';

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
  surface0: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  text: '#cdd6f4',
  subtext0: '#a6adc8',
  subtext1: '#bac2de',
  blue: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
  yellow: '#f9e2af',
  mauve: '#cba6f7',
  peach: '#fab387',
  teal: '#94e2d5',
  pink: '#f5c2e7',
  overlay0: '#6c7086',
};

// ============================================================================
// FILE ITEM
// ============================================================================

interface FileItemProps {
  file: GitFileStatus | string;
  isUntracked?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
  onView?: () => void;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  isUntracked,
  isSelected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
  onView,
}) => {
  const path = typeof file === 'string' ? file : file.path;
  const status = typeof file === 'string' ? 'untracked' : file.status;
  const staged = typeof file === 'string' ? false : file.staged;
  
  const getStatusColor = () => {
    switch (status) {
      case 'added': return colors.green;
      case 'modified': return colors.yellow;
      case 'deleted': return colors.red;
      case 'renamed': return colors.blue;
      case 'untracked': return colors.subtext0;
      default: return colors.text;
    }
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'added': return <FilePlus size={14} color={colors.green} />;
      case 'modified': return <FileDiff size={14} color={colors.yellow} />;
      case 'deleted': return <FileX size={14} color={colors.red} />;
      case 'renamed': return <File size={14} color={colors.blue} />;
      default: return <File size={14} color={colors.subtext0} />;
    }
  };
  
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        background: isSelected ? colors.surface0 : 'transparent',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {getStatusIcon()}
      <span style={{ flex: 1, color: getStatusColor(), fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {path}
      </span>
      
      <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
        {onView && (
          <button
            onClick={onView}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.subtext0,
              cursor: 'pointer',
            }}
            title="View diff"
          >
            <Eye size={14} />
          </button>
        )}
        
        {staged && onUnstage && (
          <button
            onClick={onUnstage}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.red,
              cursor: 'pointer',
            }}
            title="Unstage"
          >
            <Minus size={14} />
          </button>
        )}
        
        {!staged && onStage && (
          <button
            onClick={onStage}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.green,
              cursor: 'pointer',
            }}
            title="Stage"
          >
            <Plus size={14} />
          </button>
        )}
        
        {!staged && onDiscard && (
          <button
            onClick={onDiscard}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.red,
              cursor: 'pointer',
            }}
            title="Discard changes"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMMIT ITEM
// ============================================================================

interface CommitItemProps {
  commit: GitCommitType;
  onSelect: () => void;
  isSelected: boolean;
}

const CommitItem: React.FC<CommitItemProps> = ({ commit, onSelect, isSelected }) => {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 12px',
        background: isSelected ? colors.surface0 : 'transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        borderLeft: `3px solid ${isSelected ? colors.blue : 'transparent'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <code style={{ color: colors.yellow, fontSize: '12px', background: colors.surface0, padding: '2px 6px', borderRadius: '4px' }}>
          {commit.shortHash}
        </code>
        {commit.refs.length > 0 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {commit.refs.slice(0, 2).map((ref, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 6px',
                  background: ref.includes('HEAD') ? colors.green + '30' : colors.blue + '30',
                  color: ref.includes('HEAD') ? colors.green : colors.blue,
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                {ref.replace('HEAD -> ', '')}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ color: colors.text, fontSize: '13px', marginBottom: '4px', lineHeight: 1.4 }}>
        {commit.message}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: colors.subtext0, fontSize: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <User size={12} />
          {commit.author.name}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          {commit.date.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// BRANCH ITEM
// ============================================================================

interface BranchItemProps {
  branch: GitBranchType;
  onCheckout: () => void;
  onDelete: () => void;
}

const BranchItem: React.FC<BranchItemProps> = ({ branch, onCheckout, onDelete }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: branch.isHead ? colors.surface0 : 'transparent',
        borderRadius: '6px',
      }}
    >
      <GitBranch size={14} color={branch.isHead ? colors.green : colors.subtext0} />
      
      <span style={{ flex: 1, color: branch.isHead ? colors.green : colors.text }}>
        {branch.name}
        {branch.isHead && ' (current)'}
      </span>
      
      {(branch.ahead > 0 || branch.behind > 0) && (
        <div style={{ display: 'flex', gap: '6px', fontSize: '12px' }}>
          {branch.ahead > 0 && (
            <span style={{ color: colors.green, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <ArrowUp size={12} />
              {branch.ahead}
            </span>
          )}
          {branch.behind > 0 && (
            <span style={{ color: colors.red, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <ArrowDown size={12} />
              {branch.behind}
            </span>
          )}
        </div>
      )}
      
      {!branch.isHead && !branch.isRemote && (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheckout();
            }}
            style={{
              padding: '4px 8px',
              background: colors.blue + '20',
              border: 'none',
              borderRadius: '4px',
              color: colors.blue,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Checkout
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.red,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GitPanelProps {
  gitService: GitService;
}

export const GitPanel: React.FC<GitPanelProps> = ({ gitService }) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'commits' | 'branches' | 'stashes'>('changes');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<GitCommitType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['staged', 'changes', 'untracked']));
  
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [newStatus, newCommits, newBranches, newStashes, branch] = await Promise.all([
        gitService.getStatus(),
        gitService.getLog({ limit: 50 }),
        gitService.getBranches(),
        gitService.getStashes(),
        gitService.getCurrentBranch(),
      ]);
      
      setStatus(newStatus);
      setCommits(newCommits);
      setBranches(newBranches);
      setStashes(newStashes);
      setCurrentBranch(branch);
    } catch (error) {
      console.error('Git refresh failed:', error);
    }
    setIsLoading(false);
  }, [gitService]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  const handleStage = useCallback(async (path: string) => {
    await gitService.stage(path);
    refresh();
  }, [gitService, refresh]);
  
  const handleUnstage = useCallback(async (path: string) => {
    await gitService.unstage(path);
    refresh();
  }, [gitService, refresh]);
  
  const handleDiscard = useCallback(async (path: string) => {
    if (window.confirm(`Discard changes to ${path}?`)) {
      await gitService.discard(path);
      refresh();
    }
  }, [gitService, refresh]);
  
  const handleStageAll = useCallback(async () => {
    await gitService.stageAll();
    refresh();
  }, [gitService, refresh]);
  
  const handleUnstageAll = useCallback(async () => {
    await gitService.unstageAll();
    refresh();
  }, [gitService, refresh]);
  
  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;
    
    await gitService.commit(commitMessage);
    setCommitMessage('');
    refresh();
  }, [gitService, commitMessage, refresh]);
  
  const handlePush = useCallback(async () => {
    await gitService.push();
    refresh();
  }, [gitService, refresh]);
  
  const handlePull = useCallback(async () => {
    await gitService.pull();
    refresh();
  }, [gitService, refresh]);
  
  const handleFetch = useCallback(async () => {
    await gitService.fetch(undefined, { all: true });
    refresh();
  }, [gitService, refresh]);
  
  const handleCheckout = useCallback(async (branchName: string) => {
    await gitService.checkout(branchName);
    refresh();
  }, [gitService, refresh]);
  
  const handleDeleteBranch = useCallback(async (branchName: string) => {
    if (window.confirm(`Delete branch ${branchName}?`)) {
      await gitService.deleteBranch(branchName);
      refresh();
    }
  }, [gitService, refresh]);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };
  
  const totalChanges = (status?.staged.length || 0) + (status?.unstaged.length || 0) + (status?.untracked.length || 0);
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: colors.base,
        color: colors.text,
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.surface0}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderGit size={20} color={colors.peach} />
            <span style={{ fontWeight: 600 }}>Source Control</span>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={refresh}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: colors.subtext0,
                cursor: 'pointer',
              }}
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleFetch}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: colors.subtext0,
                cursor: 'pointer',
              }}
              title="Fetch"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handlePull}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: colors.subtext0,
                cursor: 'pointer',
              }}
              title="Pull"
            >
              <ArrowDown size={16} />
            </button>
            <button
              onClick={handlePush}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: colors.subtext0,
                cursor: 'pointer',
              }}
              title="Push"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
        
        {/* Current branch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: colors.surface0,
            borderRadius: '6px',
          }}
        >
          <GitBranch size={14} color={colors.green} />
          <span style={{ color: colors.text, fontSize: '13px' }}>{currentBranch}</span>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
          {[
            { id: 'changes' as const, label: 'Changes', count: totalChanges },
            { id: 'commits' as const, label: 'Commits', count: commits.length },
            { id: 'branches' as const, label: 'Branches', count: branches.length },
            { id: 'stashes' as const, label: 'Stashes', count: stashes.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: activeTab === tab.id ? colors.surface0 : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: activeTab === tab.id ? colors.text : colors.subtext0,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'changes' && status && (
            <motion.div
              key="changes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '12px' }}
            >
              {/* Commit input */}
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  placeholder="Commit message..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px 12px',
                    background: colors.surface0,
                    border: `1px solid ${colors.surface1}`,
                    borderRadius: '6px',
                    color: colors.text,
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={handleCommit}
                  disabled={!commitMessage.trim() || status.staged.length === 0}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '10px',
                    background: commitMessage.trim() && status.staged.length > 0 ? colors.blue : colors.surface1,
                    border: 'none',
                    borderRadius: '6px',
                    color: commitMessage.trim() && status.staged.length > 0 ? colors.base : colors.subtext0,
                    cursor: commitMessage.trim() && status.staged.length > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                  }}
                >
                  <Check size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Commit ({status.staged.length} staged)
                </button>
              </div>
              
              {/* Staged Changes */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  onClick={() => toggleSection('staged')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 0',
                    cursor: 'pointer',
                  }}
                >
                  {expandedSections.has('staged') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontWeight: 500 }}>Staged Changes ({status.staged.length})</span>
                  {status.staged.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstageAll();
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 6px',
                        background: 'transparent',
                        border: 'none',
                        color: colors.subtext0,
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Unstage All
                    </button>
                  )}
                </div>
                {expandedSections.has('staged') && (
                  <div style={{ paddingLeft: '8px' }}>
                    {status.staged.map((file) => (
                      <FileItem
                        key={file.path}
                        file={file}
                        isSelected={selectedFile === file.path}
                        onSelect={() => setSelectedFile(file.path)}
                        onUnstage={() => handleUnstage(file.path)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Changes */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  onClick={() => toggleSection('changes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 0',
                    cursor: 'pointer',
                  }}
                >
                  {expandedSections.has('changes') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontWeight: 500 }}>Changes ({status.unstaged.length})</span>
                  {status.unstaged.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStageAll();
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 6px',
                        background: 'transparent',
                        border: 'none',
                        color: colors.subtext0,
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Stage All
                    </button>
                  )}
                </div>
                {expandedSections.has('changes') && (
                  <div style={{ paddingLeft: '8px' }}>
                    {status.unstaged.map((file) => (
                      <FileItem
                        key={file.path}
                        file={file}
                        isSelected={selectedFile === file.path}
                        onSelect={() => setSelectedFile(file.path)}
                        onStage={() => handleStage(file.path)}
                        onDiscard={() => handleDiscard(file.path)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Untracked */}
              <div>
                <div
                  onClick={() => toggleSection('untracked')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 0',
                    cursor: 'pointer',
                  }}
                >
                  {expandedSections.has('untracked') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span style={{ fontWeight: 500 }}>Untracked ({status.untracked.length})</span>
                </div>
                {expandedSections.has('untracked') && (
                  <div style={{ paddingLeft: '8px' }}>
                    {status.untracked.map((path) => (
                      <FileItem
                        key={path}
                        file={path}
                        isUntracked
                        isSelected={selectedFile === path}
                        onSelect={() => setSelectedFile(path)}
                        onStage={() => handleStage(path)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'commits' && (
            <motion.div
              key="commits"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '12px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {commits.map((commit) => (
                  <CommitItem
                    key={commit.hash}
                    commit={commit}
                    isSelected={selectedCommit?.hash === commit.hash}
                    onSelect={() => setSelectedCommit(commit)}
                  />
                ))}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'branches' && (
            <motion.div
              key="branches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '12px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {branches.filter(b => !b.isRemote).map((branch) => (
                  <BranchItem
                    key={branch.name}
                    branch={branch}
                    onCheckout={() => handleCheckout(branch.name)}
                    onDelete={() => handleDeleteBranch(branch.name)}
                  />
                ))}
                
                {branches.filter(b => b.isRemote).length > 0 && (
                  <>
                    <div style={{ padding: '12px 0 8px', color: colors.subtext0, fontSize: '12px', fontWeight: 500 }}>
                      Remote Branches
                    </div>
                    {branches.filter(b => b.isRemote).map((branch) => (
                      <BranchItem
                        key={branch.name}
                        branch={branch}
                        onCheckout={() => handleCheckout(branch.name)}
                        onDelete={() => {}}
                      />
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'stashes' && (
            <motion.div
              key="stashes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '12px' }}
            >
              {stashes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: colors.subtext0 }}>
                  <Inbox size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>No stashes</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stashes.map((stash) => (
                    <div
                      key={stash.index}
                      style={{
                        padding: '12px',
                        background: colors.surface0,
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <code style={{ color: colors.yellow, fontSize: '12px' }}>stash@{'{' + stash.index + '}'}</code>
                        <span style={{ color: colors.text }}>{stash.message}</span>
                      </div>
                      <div style={{ color: colors.subtext0, fontSize: '12px' }}>
                        {stash.branch} • {stash.date.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GitPanel;
