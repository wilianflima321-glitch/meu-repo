'use client';

import React from 'react';
import { colors } from './ProjectsDashboard.constants';
import { ProjectsDashboardCollection, ProjectsDashboardToolbar } from './ProjectsDashboardCollection';
import { ProjectsDashboardCreateModal } from './ProjectsDashboardCreateModal';
import { ProjectsDashboardHeader, ProjectsDashboardQuickActions, ProjectsDashboardStatsGrid } from './ProjectsDashboardSections';
import { useProjectsDashboardController } from './useProjectsDashboardController';

export const ProjectsDashboard: React.FC = () => {
  const controller = useProjectsDashboardController();

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '32px' }}>
      <ProjectsDashboardHeader onCreateProject={() => controller.setShowCreateModal(true)} />

      <ProjectsDashboardStatsGrid stats={controller.stats} />

      <ProjectsDashboardToolbar
        filterType={controller.filterType}
        hasActiveFilters={controller.hasActiveFilters}
        resultsLabel={controller.resultsLabel}
        search={controller.search}
        view={controller.view}
        onClearFilters={controller.clearFilters}
        onFilterTypeChange={controller.setFilterType}
        onSearchChange={controller.setSearch}
        onViewChange={controller.setView}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <ProjectsDashboardCollection
          filteredProjects={controller.filteredProjects}
          hasActiveFilters={controller.hasActiveFilters}
          search={controller.search}
          view={controller.view}
          onClearFilters={controller.clearFilters}
          onCreateProject={() => controller.setShowCreateModal(true)}
          onDeleteProject={controller.handleDeleteProject}
          onOpenProject={controller.handleOpenProject}
          onToggleFavorite={controller.handleToggleFavorite}
        />
      </div>

      <ProjectsDashboardQuickActions />

      <ProjectsDashboardCreateModal
        isOpen={controller.showCreateModal}
        onClose={() => controller.setShowCreateModal(false)}
        onCreate={controller.handleCreateProject}
      />
    </div>
  );
};

export default ProjectsDashboard;
