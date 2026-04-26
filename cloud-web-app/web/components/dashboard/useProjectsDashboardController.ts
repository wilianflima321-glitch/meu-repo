'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { openConfirmDialog } from '@/lib/ui/non-blocking-dialogs';
import { createComponentLogger } from '@/lib/observability/logger';
import { fetcher } from './ProjectsDashboard.constants';
import type {
  CreateProjectPayload,
  DashboardStats,
  DashboardView,
  Project,
  ProjectFilterType,
} from './ProjectsDashboard.types';

const log = createComponentLogger('ProjectsDashboard');

type QuotaRecord = { resource?: string; used?: number };

type ProjectsApiResponse = { success: boolean; data: Project[] };

type UsageStatusResponse = {
  data?: {
    usage?: {
      tokens?: {
        used?: number;
      };
    };
  };
};

type QuotasResponse = {
  quotas?: QuotaRecord[];
};

export function useProjectsDashboardController() {
  const router = useRouter();
  const [view, setView] = useState<DashboardView>('grid');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<ProjectFilterType>('all');

  const { data: projectsData, mutate } = useSWR<ProjectsApiResponse>('/api/projects', fetcher);
  const { data: usageStatus } = useSWR<UsageStatusResponse>('/api/usage/status', fetcher);
  const { data: quotasData } = useSWR<QuotasResponse>('/api/quotas', fetcher);

  const projects = useMemo(() => projectsData?.data ?? [], [projectsData?.data]);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filterType !== 'all' && project.type !== filterType) return false;
      if (!normalizedSearch) return true;
      const name = project.name.toLowerCase();
      const description = project.description?.toLowerCase() ?? '';
      return name.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [filterType, normalizedSearch, projects]);

  const storageQuota = Array.isArray(quotasData?.quotas)
    ? quotasData.quotas.find((quota) => quota.resource === 'storage_mb')
    : null;
  const storageUsedMb = Number(storageQuota?.used ?? 0);
  const storageDisplay = storageUsedMb >= 1024
    ? `${(storageUsedMb / 1024).toFixed(1)} GB`
    : `${Math.round(storageUsedMb)} MB`;

  const stats: DashboardStats = useMemo(() => ({
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === 'active').length,
    totalStorage: storageDisplay,
    aiTokensUsed: Number(usageStatus?.data?.usage?.tokens?.used ?? 0),
  }), [projects, storageDisplay, usageStatus?.data?.usage?.tokens?.used]);

  const hasActiveFilters = filterType !== 'all' || normalizedSearch.length > 0;

  const handleCreateProject = useCallback(async (data: CreateProjectPayload) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project (${response.status})`);
      }

      await mutate();
    } catch (error) {
      log.error('Failed to create project', error);
    }
  }, [mutate]);

  const handleOpenProject = useCallback((projectId: string) => {
    router.push(`/ide?project=${projectId}`);
  }, [router]);

  const handleToggleFavorite = useCallback(async (projectId: string) => {
    await fetch(`/api/projects/${projectId}/favorite`, { method: 'POST' });
    await mutate();
  }, [mutate]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    const shouldDelete = await openConfirmDialog({
      title: 'Excluir projeto',
      message: 'Tem certeza que deseja excluir este projeto?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });

    if (!shouldDelete) return;

    await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    await mutate();
  }, [mutate]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilterType('all');
  }, []);

  const resultsLabel = `${filteredProjects.length} ${filteredProjects.length === 1 ? 'projeto' : 'projetos'}`;

  return {
    filteredProjects,
    filterType,
    hasActiveFilters,
    projects,
    resultsLabel,
    search,
    showCreateModal,
    stats,
    view,
    clearFilters,
    handleCreateProject,
    handleDeleteProject,
    handleOpenProject,
    handleToggleFavorite,
    setFilterType,
    setSearch,
    setShowCreateModal,
    setView,
  };
}
