/**
 * Projects Dashboard Component - gestão operacional de projetos.
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertCircle,
  Archive,
  CreditCard,
  FolderOpen,
  Grid,
  List,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  dashboardFetcher as fetcher,
  projectDashboardColors as colors,
} from './ProjectsDashboard.constants';
import { ProjectCard, QuickActionCard, StatCard } from './ProjectsDashboard.cards';
import { CreateProjectModal } from './ProjectsDashboard.modal';
import type { CreateProjectData, DashboardStats, Project } from './ProjectsDashboard.types';

export const ProjectsDashboard: React.FC = () => {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<Project['type'] | 'all'>('all');

  const { data: projectsData, mutate } = useSWR<{ success: boolean; data: Project[] }>('/api/projects', fetcher);
  const { data: usageStatus } = useSWR<any>('/api/usage/status', fetcher);
  const { data: quotasData } = useSWR<any>('/api/quotas', fetcher);

  const projects = projectsData?.data || [];

  const filteredProjects = projects.filter((project) => {
    if (filterType !== 'all' && project.type !== filterType) return false;
    if (search && !project.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const storageQuota = Array.isArray(quotasData?.quotas)
    ? quotasData.quotas.find((quota: any) => quota.resource === 'storage_mb')
    : null;
  const storageUsedMb = Number(storageQuota?.used ?? 0);
  const storageDisplay = storageUsedMb >= 1024 ? `${(storageUsedMb / 1024).toFixed(1)} GB` : `${Math.round(storageUsedMb)} MB`;

  const stats: DashboardStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === 'active').length,
    totalStorage: storageDisplay,
    aiTokensUsed: Number(usageStatus?.data?.usage?.tokens?.used ?? 0),
  };

  const handleCreateProject = useCallback(
    async (data: CreateProjectData) => {
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
    },
    [mutate]
  );

  const handleOpenProject = useCallback(
    (projectId: string) => {
      router.push(`/ide?project=${projectId}`);
    },
    [router]
  );

  const handleToggleFavorite = useCallback(
    async (projectId: string) => {
      await fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' });
      mutate();
    },
    [mutate]
  );

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      mutate();
    },
    [mutate]
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '32px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: 600, color: colors.text }}>Meus Projetos</h1>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted }}>Gerencie seus projetos e comece a criar.</p>
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

      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <StatCard icon={<FolderOpen size={20} />} label="Total de Projetos" value={stats.totalProjects} />
          <StatCard icon={<Zap size={20} />} label="Projetos Ativos" value={stats.activeProjects} color={colors.success} />
          <StatCard icon={<Archive size={20} />} label="Storage Usado" value={stats.totalStorage} color={colors.accent} />
          <StatCard icon={<Sparkles size={20} />} label="Tokens AI Usados" value={stats.aiTokensUsed.toLocaleString()} color={colors.warning} />
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }}
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

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as Project['type'] | 'all')}
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

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {filteredProjects.length === 0 ? (
          <div style={{ padding: '64px 32px', background: colors.surface, borderRadius: '16px', textAlign: 'center' }}>
            <FolderOpen size={48} color={colors.textDim} style={{ marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: colors.text, fontSize: '18px' }}>
              {search ? 'Nenhum projeto encontrado' : 'Comece criando seu primeiro projeto'}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: colors.textMuted, fontSize: '14px' }}>
              {search ? 'Tente uma busca diferente ou ajuste os filtros.' : 'Crie um novo projeto e comece a desenvolver sua próxima grande ideia.'}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
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

      <div style={{ maxWidth: '1400px', margin: '48px auto 0' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 500, color: colors.text }}>Acesso Rápido</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <QuickActionCard icon={<Settings size={20} />} label="Configurações" href="/settings" />
          <QuickActionCard icon={<CreditCard size={20} />} label="Faturamento" href="/billing" />
          <QuickActionCard icon={<Users size={20} />} label="Equipe" href="/team" />
          <QuickActionCard icon={<AlertCircle size={20} />} label="Suporte" href="/help" />
        </div>
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

export default ProjectsDashboard;
