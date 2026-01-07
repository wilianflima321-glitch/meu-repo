/**
 * Projects Dashboard Component - Gestão Limpa
 * 
 * Dashboard focado APENAS em gestão:
 * - Lista de projetos
 * - Criar novo projeto
 * - Configurações
 * - Billing
 * 
 * Clicando em projeto → abre /ide/[id] ou /editor/[id]
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Plus,
  FolderOpen,
  Settings,
  CreditCard,
  Clock,
  Star,
  StarOff,
  MoreHorizontal,
  Trash2,
  Copy,
  Share2,
  Archive,
  Play,
  Search,
  Filter,
  Grid,
  List,
  SortAsc,
  Gamepad2,
  Globe,
  Code,
  Box,
  Users,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'game' | 'web' | 'api' | 'library' | 'other';
  status: 'active' | 'paused' | 'archived';
  thumbnail?: string;
  lastModified: string;
  createdAt: string;
  isFavorite: boolean;
  membersCount: number;
  progress?: number;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalStorage: string;
  aiTokensUsed: number;
}

// ============================================================================
// STYLES
// ============================================================================

const colors = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a25',
  surfaceActive: '#22222f',
  border: '#2a2a3a',
  borderFocus: '#4f46e5',
  text: '#e4e4eb',
  textMuted: '#8b8b9e',
  textDim: '#5a5a6e',
  primary: '#6366f1',
  primaryHover: '#5558e3',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  accent: '#8b5cf6',
};

const typeIcons: Record<Project['type'], React.ReactNode> = {
  game: <Gamepad2 size={18} />,
  web: <Globe size={18} />,
  api: <Code size={18} />,
  library: <Box size={18} />,
  other: <FolderOpen size={18} />,
};

const typeColors: Record<Project['type'], string> = {
  game: colors.accent,
  web: colors.primary,
  api: colors.success,
  library: colors.warning,
  other: colors.textMuted,
};

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard: React.FC<{
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
          color: color,
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

// ============================================================================
// PROJECT CARD
// ============================================================================

const ProjectCard: React.FC<{
  project: Project;
  view: 'grid' | 'list';
  onOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}> = ({ project, view, onOpen, onToggleFavorite, onDelete, onDuplicate, onShare }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    return 'Agora';
  };

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
          <div style={{ fontSize: '12px', color: colors.textMuted }}>{project.description || 'Sem descrição'}</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}>
            <Users size={14} />
            {project.membersCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textMuted, fontSize: '12px' }}>
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
      {/* Thumbnail */}
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
        
        {/* Status badge */}
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
        
        {/* Favorite */}
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
      
      {/* Content */}
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
              {project.description || 'Sem descrição'}
            </p>
          </div>
          
          {/* Menu */}
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
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  onClick={() => setShowMenu(false)}
                />
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
        
        {/* Meta */}
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

// ============================================================================
// MENU BUTTON
// ============================================================================

const MenuButton: React.FC<{
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

// ============================================================================
// CREATE PROJECT MODAL
// ============================================================================

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; type: Project['type']; description: string }) => void;
}

const CreateProjectModal: React.FC<CreateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<Project['type']>('game');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), type, description: description.trim() });
    setName('');
    setType('game');
    setDescription('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '480px',
          maxWidth: '90vw',
          background: colors.surface,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          zIndex: 1001,
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: colors.text }}>
            Novo Projeto
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: colors.textMuted }}>
            Configure seu novo projeto de desenvolvimento.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.text }}>
              Nome do Projeto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu Projeto Incrível"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
              }}
              autoFocus
            />
          </div>
          
          {/* Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.text }}>
              Tipo de Projeto
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['game', 'web', 'api', 'library', 'other'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px',
                    background: type === t ? typeColors[t] + '20' : colors.bg,
                    border: `1px solid ${type === t ? typeColors[t] : colors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: type === t ? typeColors[t] : colors.textMuted,
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {typeIcons[t]}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: colors.text }}>
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição do projeto..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
              }}
            />
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: '10px 20px',
                background: !name.trim() ? colors.textDim : colors.primary,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: !name.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProjectsDashboard: React.FC = () => {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<Project['type'] | 'all'>('all');

  // Fetch projects
  const { data: projectsData, mutate } = useSWR<{ success: boolean; data: Project[] }>(
    '/api/projects',
    fetcher,
    {
      fallbackData: {
        success: true,
        data: [
          // Mock data para demonstração
          {
            id: '1',
            name: 'My First Game',
            description: 'An epic RPG adventure',
            type: 'game',
            status: 'active',
            lastModified: new Date().toISOString(),
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            isFavorite: true,
            membersCount: 3,
            progress: 45,
          },
          {
            id: '2',
            name: 'Portfolio Website',
            description: 'Personal portfolio',
            type: 'web',
            status: 'active',
            lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            isFavorite: false,
            membersCount: 1,
          },
        ],
      },
    }
  );

  const projects = projectsData?.data || [];

  // Filter and search
  const filteredProjects = projects.filter((p) => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats: DashboardStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    totalStorage: '2.4 GB',
    aiTokensUsed: 45000,
  };

  // Handlers
  const handleCreateProject = useCallback(async (data: { name: string; type: Project['type']; description: string }) => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      mutate();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }, [mutate]);

  const handleOpenProject = useCallback((projectId: string) => {
    router.push(`/ide?project=${projectId}`);
  }, [router]);

  const handleToggleFavorite = useCallback(async (projectId: string) => {
    await fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' });
    mutate();
  }, [mutate]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    mutate();
  }, [mutate]);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '32px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 600, color: colors.text }}>
              Meus Projetos
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>
              Gerencie seus projetos e comece a criar.
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: colors.primary,
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = colors.primaryHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = colors.primary)}
          >
            <Plus size={18} />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <StatCard icon={<FolderOpen size={20} />} label="Total de Projetos" value={stats.totalProjects} />
          <StatCard icon={<Zap size={20} />} label="Projetos Ativos" value={stats.activeProjects} color={colors.success} />
          <StatCard icon={<Archive size={20} />} label="Storage Usado" value={stats.totalStorage} color={colors.accent} />
          <StatCard icon={<Sparkles size={20} />} label="Tokens AI Usados" value={stats.aiTokensUsed.toLocaleString()} trend={12} color={colors.warning} />
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textMuted,
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projetos..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={{
              padding: '10px 32px 10px 12px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
              fontSize: '14px',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238b8b9e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '16px',
            }}
          >
            <option value="all">Todos os tipos</option>
            <option value="game">Games</option>
            <option value="web">Web</option>
            <option value="api">API</option>
            <option value="library">Library</option>
          </select>
          
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: colors.surface,
              borderRadius: '8px',
              padding: '4px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <button
              onClick={() => setView('grid')}
              style={{
                padding: '6px 10px',
                background: view === 'grid' ? colors.surfaceActive : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: view === 'grid' ? colors.text : colors.textMuted,
                cursor: 'pointer',
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 10px',
                background: view === 'list' ? colors.surfaceActive : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: view === 'list' ? colors.text : colors.textMuted,
                cursor: 'pointer',
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {filteredProjects.length === 0 ? (
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
              {search ? 'Nenhum projeto encontrado' : 'Comece criando seu primeiro projeto'}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: colors.textMuted, fontSize: '14px' }}>
              {search 
                ? 'Tente uma busca diferente ou ajuste os filtros.'
                : 'Crie um novo projeto e comece a desenvolver sua próxima grande ideia.'}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: colors.primary,
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} />
                Criar Primeiro Projeto
              </button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                view="grid"
                onOpen={() => handleOpenProject(project.id)}
                onToggleFavorite={() => handleToggleFavorite(project.id)}
                onDelete={() => handleDeleteProject(project.id)}
                onDuplicate={() => console.log('Duplicate:', project.id)}
                onShare={() => console.log('Share:', project.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                view="list"
                onOpen={() => handleOpenProject(project.id)}
                onToggleFavorite={() => handleToggleFavorite(project.id)}
                onDelete={() => handleDeleteProject(project.id)}
                onDuplicate={() => console.log('Duplicate:', project.id)}
                onShare={() => console.log('Share:', project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ maxWidth: '1400px', margin: '48px auto 0' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: colors.text }}>
          Acesso Rápido
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <QuickActionCard
            icon={<Settings size={20} />}
            label="Configurações"
            href="/settings"
          />
          <QuickActionCard
            icon={<CreditCard size={20} />}
            label="Faturamento"
            href="/billing"
          />
          <QuickActionCard
            icon={<Users size={20} />}
            label="Equipe"
            href="/team"
          />
          <QuickActionCard
            icon={<AlertCircle size={20} />}
            label="Suporte"
            href="/help"
          />
        </div>
      </div>

      {/* Create Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

// ============================================================================
// QUICK ACTION CARD
// ============================================================================

const QuickActionCard: React.FC<{
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

export default ProjectsDashboard;
