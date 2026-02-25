import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Clock,
  Copy,
  MoreHorizontal,
  Play,
  Share2,
  Star,
  StarOff,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  projectDashboardColors as colors,
  projectTypeColors as typeColors,
  projectTypeIcons as typeIcons,
} from './ProjectsDashboard.constants';
import type { Project } from './ProjectsDashboard.types';

const relativeTime = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  return 'Agora';
};

export const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  color?: string;
}> = ({ icon, label, value, trend, color = colors.primary }) => (
  <div
    style={{
      padding: '20px',
      background: colors.surface,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: color + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {icon}
      </div>
      {trend !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: trend >= 0 ? colors.success : colors.error,
          }}
        >
          <TrendingUp size={14} style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '24px', fontWeight: 600, color: colors.text }}>{value}</div>
      <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '2px' }}>{label}</div>
    </div>
  </div>
);

export const MenuButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
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
    onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceHover)}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {icon}
    {label}
  </button>
);

export const ProjectCard: React.FC<{
  project: Project;
  view: 'grid' | 'list';
  onOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}> = ({ project, view, onOpen, onToggleFavorite, onDelete, onDuplicate, onShare }) => {
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
        onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = colors.surface)}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: typeColors[project.type] + '15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: typeColors[project.type],
          }}
        >
          {typeIcons[project.type]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.text, fontWeight: 500, fontSize: '14px' }}>{project.name}</span>
            {project.isFavorite && <Star size={14} fill={colors.warning} color={colors.warning} />}
          </div>
          <div style={{ fontSize: '12px', color: colors.textMuted }}>
            {project.description || 'Sem descrição'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}
          >
            <Users size={14} />
            {project.membersCount}
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}
          >
            <Clock size={14} />
            {relativeTime(project.lastModified)}
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
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.borderFocus;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.transform = 'translateY(0)';
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
            {React.cloneElement(typeIcons[project.type] as React.ReactElement, { size: 48 })}
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
              color: '#fff',
              fontSize: '10px',
              fontWeight: 500,
              textTransform: 'uppercase',
            }}
          >
            {project.status === 'paused' ? 'Pausado' : 'Arquivado'}
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
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
        <div
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}
        >
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
              {project.description || 'Sem descrição'}
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
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
                  <MenuButton icon={<Play size={14} />} label="Abrir" onClick={onOpen} />
                  <MenuButton icon={<Copy size={14} />} label="Duplicar" onClick={onDuplicate} />
                  <MenuButton icon={<Share2 size={14} />} label="Compartilhar" onClick={onShare} />
                  <div style={{ height: '1px', background: colors.border, margin: '4px 0' }} />
                  <MenuButton icon={<Trash2 size={14} />} label="Excluir" onClick={onDelete} danger />
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
              background: typeColors[project.type] + '15',
              color: typeColors[project.type],
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            {typeIcons[project.type]}
            {project.type.charAt(0).toUpperCase() + project.type.slice(1)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textMuted, fontSize: '11px' }}>
            <Clock size={12} />
            {relativeTime(project.lastModified)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuickActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  href: string;
}> = ({ icon, label, href }) => (
  <Link
    href={href}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      background: colors.surface,
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
      textDecoration: 'none',
      color: colors.text,
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = colors.borderFocus;
      e.currentTarget.style.background = colors.surfaceHover;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = colors.border;
      e.currentTarget.style.background = colors.surface;
    }}
  >
    <div style={{ color: colors.primary }}>{icon}</div>
    <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
    <ChevronRight size={16} color={colors.textDim} style={{ marginLeft: 'auto' }} />
  </Link>
);
