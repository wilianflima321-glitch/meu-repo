'use client';

import { Grid, List, Search } from 'lucide-react';
import { colors, projectTypeOptions } from './ProjectsDashboard.constants';
import type { DashboardView, Project, ProjectFilterType } from './ProjectsDashboard.types';
import { ProjectCard, ProjectsDashboardEmptyState } from './ProjectsDashboardCollection.cards';

export function ProjectsDashboardToolbar({
  filterType,
  hasActiveFilters,
  resultsLabel,
  search,
  view,
  onClearFilters,
  onFilterTypeChange,
  onSearchChange,
  onViewChange,
}: {
  filterType: ProjectFilterType;
  hasActiveFilters: boolean;
  resultsLabel: string;
  search: string;
  view: DashboardView;
  onClearFilters: () => void;
  onFilterTypeChange: (value: ProjectFilterType) => void;
  onSearchChange: (value: string) => void;
  onViewChange: (value: DashboardView) => void;
}) {
  return (
  <div style={{ maxWidth: '1400px', margin: '0 auto 24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
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
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search projects by name or description..."
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
        onChange={(event) => onFilterTypeChange(event.target.value as ProjectFilterType)}
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
        <option value="all">All types</option>
        {projectTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
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
          type="button"
          aria-label="Switch to grid view"
          onClick={() => onViewChange('grid')}
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
          type="button"
          aria-label="Switch to list view"
          onClick={() => onViewChange('list')}
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

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: colors.textMuted }}>{resultsLabel}</span>
      {hasActiveFilters && (
        <button
          type="button"
          aria-label="Clear active filters"
          onClick={onClearFilters}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.text,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  </div>
);
}

export function ProjectsDashboardCollection({
  filteredProjects,
  hasActiveFilters,
  search,
  view,
  onClearFilters,
  onCreateProject,
  onDeleteProject,
  onOpenProject,
  onToggleFavorite,
}: {
  filteredProjects: Project[];
  hasActiveFilters: boolean;
  search: string;
  view: DashboardView;
  onClearFilters: () => void;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onToggleFavorite: (projectId: string) => void;
}) {
  if (filteredProjects.length === 0) {
    return (
      <ProjectsDashboardEmptyState
        hasActiveFilters={hasActiveFilters}
        search={search}
        onClearFilters={onClearFilters}
        onCreateProject={onCreateProject}
      />
    );
  }

  if (view === 'grid') {
    return (
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
            onOpen={() => onOpenProject(project.id)}
            onToggleFavorite={() => onToggleFavorite(project.id)}
            onDelete={() => onDeleteProject(project.id)}
            onDuplicate={() => undefined}
            onShare={() => undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {filteredProjects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          view="list"
          onOpen={() => onOpenProject(project.id)}
          onToggleFavorite={() => onToggleFavorite(project.id)}
          onDelete={() => onDeleteProject(project.id)}
          onDuplicate={() => undefined}
          onShare={() => undefined}
        />
      ))}
    </div>
  );
}
