'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Clock, Eye, File, FileDiff, FilePlus, FileX, GitBranch, Minus, Plus, RotateCcw, Trash2, User } from 'lucide-react';
import type { GitBranch as GitBranchType, GitCommit as GitCommitType, GitFileStatus } from '@/lib/git/git-service';

// ============================================================================
// STYLES
// ============================================================================

export const colors = {
  base: 'var(--aethel-surface-primary)',
  mantle: 'var(--aethel-surface-secondary)',
  crust: 'var(--aethel-surface-primary)',
  surface0: 'var(--aethel-surface-tertiary)',
  surface1: 'var(--aethel-surface-quaternary)',
  surface2: 'var(--aethel-text-quaternary)',
  text: 'var(--aethel-text-primary)',
  subtext0: 'var(--aethel-text-tertiary)',
  subtext1: 'var(--aethel-text-secondary)',
  blue: 'var(--aethel-info)',
  green: 'var(--aethel-success-light)',
  red: 'var(--aethel-error-light)',
  yellow: 'var(--aethel-warning-light)',
  mauve: 'var(--aethel-accent-light)',
  peach: 'var(--aethel-warning)',
  teal: 'var(--aethel-info-light)',
  cyan: 'var(--aethel-error-light)',
  overlay0: 'var(--aethel-text-muted)',
};

// ============================================================================
// FILE ITEM
// ============================================================================

export interface FileItemProps {
  file: GitFileStatus | string;
  isUntracked?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
  onView?: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
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
          <button type="button" aria-label={`View diff for ${path}`}
            onClick={onView}
            style={{
              padding: '4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: colors.subtext0,
              cursor: 'pointer',
            }}
            title="Ver diff"
          >
            <Eye size={14} />
          </button>
        )}

        {staged && onUnstage && (
          <button type="button" aria-label={`Unstage ${path}`}
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
          <button type="button" aria-label={`Stage ${path}`}
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
          <button type="button" aria-label={`Discard changes in ${path}`}
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

export interface CommitItemProps {
  commit: GitCommitType;
  onSelect: () => void;
  isSelected: boolean;
}

export const CommitItem: React.FC<CommitItemProps> = ({ commit, onSelect, isSelected }) => {
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

export interface BranchItemProps {
  branch: GitBranchType;
  onCheckout: () => void;
  onDelete: () => void;
}

export const BranchItem: React.FC<BranchItemProps> = ({ branch, onCheckout, onDelete }) => {
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
          <button type="button" aria-label={`Checkout branch ${branch.name}`}
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
            Trocar
          </button>
          <button type="button" aria-label={`Delete branch ${branch.name}`}
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
