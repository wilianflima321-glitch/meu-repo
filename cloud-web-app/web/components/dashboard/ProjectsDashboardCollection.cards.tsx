'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRight, Clock, Copy, FolderOpen, MoreHorizontal, Play, Share2, Star, StarOff, Trash2, Users } from 'lucide-react'
import { colors, formatProjectTypeLabel, formatRelativeProjectTime, renderProjectTypeIcon, tint, typeColors } from './ProjectsDashboard.constants'
import type { DashboardView, Project } from './ProjectsDashboard.types'

function MenuButton({ icon, label, onClick, danger }: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
  <button
    type="button"
    aria-label={label}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      padding: '8px 12px',
      background: 'transparent',
      border: 'none',
      borderRadius: '6px',
      color: danger ? colors.error : colors.text,
      fontSize: '13px',
      cursor: 'pointer',
      textAlign: 'left',
    }}
    onMouseEnter={(event) => (event.currentTarget.style.background = colors.surfaceHover)}
    onMouseLeave={(event) => (event.currentTarget.style.background = 'transparent')}
  >
    {icon}
    {label}
  </button>
);
}

export function ProjectCard({
  project,
  view,
  onOpen,
  onToggleFavorite,
  onDelete,
  onDuplicate,
  onShare,
}: {
  project: Project;
  view: DashboardView;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (view === 'list') {
    return (
      <div
        onClick={onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 16px',
          background: colors.surface,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(event) => (event.currentTarget.style.background = colors.surfaceHover)}
        onMouseLeave={(event) => (event.currentTarget.style.background = colors.surface)}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: tint(typeColors[project.type], 15),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: typeColors[project.type],
          }}
        >
          {renderProjectTypeIcon(project.type)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.text, fontWeight: 500, fontSize: '14px' }}>{project.name}</span>
            {project.isFavorite && <Star size={14} fill={colors.warning} color={colors.warning} />}
          </div>
          <div style={{ fontSize: '12px', color: colors.textMuted }}>{project.description || 'No description'}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}>
            <Users size={14} />
            {project.membersCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}>
            <Clock size={14} />
            {formatRelativeProjectTime(project.lastModified)}
          </div>
        </div>

        <ChevronRight size={18} color={colors.textDim} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = colors.borderFocus;
        event.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = colors.border;
        event.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        onClick={onOpen}
        style={{
          height: '120px',
          background: project.thumbnail
            ? `url(${project.thumbnail}) center/cover`
            : `linear-gradient(135deg, ${typeColors[project.type]}20, ${colors.bg})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {!project.thumbnail && (
          <div style={{ color: typeColors[project.type], opacity: 0.5 }}>
            {renderProjectTypeIcon(project.type, 48)}
          </div>
        )}

        {project.status !== 'active' && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
              background: project.status === 'paused' ? colors.warning : colors.textDim,
              color: 'var(--aethel-text-primary)',
              fontSize: '10px',
              fontWeight: 500,
              textTransform: 'uppercase',
            }}
          >
            {project.status === 'paused' ? 'Paused' : 'Archived'}
          </div>
        )}

        <button
          type="button"
          aria-label={project.isFavorite ? `Remove ${project.name} from favorites` : `Add ${project.name} to favorites`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: project.isFavorite ? colors.warning : colors.textMuted,
          }}
        >
          {project.isFavorite ? <Star size={16} fill={colors.warning} /> : <StarOff size={16} />}
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div onClick={onOpen} style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: colors.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.name}
            </h3>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '12px',
                color: colors.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.description || 'No description'}
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label={`Open project actions menu ${project.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setShowMenu(!showMenu);
              }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textMuted,
              }}
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: colors.surfaceActive,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '4px',
                    zIndex: 100,
                    minWidth: '150px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <MenuButton icon={<Play size={14} />} label="Open" onClick={onOpen} />
                  <MenuButton icon={<Copy size={14} />} label="Duplicate" onClick={onDuplicate} />
                  <MenuButton icon={<Share2 size={14} />} label="Share" onClick={onShare} />
                  <div style={{ height: '1px', background: colors.border, margin: '4px 0' }} />
                  <MenuButton icon={<Trash2 size={14} />} label="Delete" onClick={onDelete} danger />
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '4px',
              background: tint(typeColors[project.type], 15),
              color: typeColors[project.type],
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            {renderProjectTypeIcon(project.type)}
            {formatProjectTypeLabel(project.type)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textMuted, fontSize: '11px' }}>
            <Clock size={12} />
            {formatRelativeProjectTime(project.lastModified)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsDashboardEmptyState({
  hasActiveFilters,
  search,
  onClearFilters,
  onCreateProject,
}: {
  hasActiveFilters: boolean;
  search: string;
  onClearFilters: () => void;
  onCreateProject: () => void;
}) {
  return (
  <div
    style={{
      padding: '64px 32px',
      background: colors.surface,
      borderRadius: '16px',
      textAlign: 'center',
    }}
  >
    <FolderOpen size={48} color={colors.textDim} style={{ marginBottom: '16px' }} />
    <h3 style={{ margin: '0 0 8px 0', color: colors.text, fontSize: '18px' }}>
      {search ? 'No projects found' : 'Start by creating your first project'}
    </h3>
    <p style={{ margin: '0 0 24px 0', color: colors.textMuted, fontSize: '14px' }}>
      {search
        ? 'Try a different search or adjust filters.'
        : 'Create a new project and start building your next big idea.'}
    </p>
    <div style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {hasActiveFilters && (
        <button
          type="button"
          aria-label="Clear project search and filters"
          onClick={onClearFilters}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: '10px',
            color: colors.text,
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Clear filters
        </button>
      )}
      {!search && (
        <button
          type="button"
          aria-label="Open modal to create first project"
          onClick={onCreateProject}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: colors.primary,
            border: 'none',
            borderRadius: '10px',
            color: 'var(--aethel-text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Create first project
        </button>
      )}
    </div>
  </div>
);
}
